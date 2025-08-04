#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fechen-aifactory"
SERVICE_ACCOUNT_EMAIL="storycraft-ai@fechen-aifactory.iam.gserviceaccount.com"

echo -e "${BLUE}=== 修復 Gemini 2.5 權限問題 ===${NC}"
echo -e "${BLUE}專案: $PROJECT_ID${NC}"
echo -e "${BLUE}服務帳號: $SERVICE_ACCOUNT_EMAIL${NC}"
echo ""

# 檢查當前用戶
CURRENT_USER=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
echo "當前用戶: $CURRENT_USER"
echo ""

# 檢查服務帳號是否存在
echo "1. 檢查服務帳號狀態..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ 服務帳號存在${NC}"
else
    echo -e "${RED}✗ 服務帳號不存在，正在創建...${NC}"
    gcloud iam service-accounts create storycraft-ai \
        --display-name="StoryCraft AI Service Account" \
        --description="Service account for StoryCraft Gemini 2.5 access" \
        --project=$PROJECT_ID
fi
echo ""

# 檢查當前權限
echo "2. 檢查服務帳號當前權限..."
SA_ROLES=$(gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT_EMAIL" --format="value(bindings.role)" 2>/dev/null)

if [ -n "$SA_ROLES" ]; then
    echo "服務帳號當前角色:"
    echo "$SA_ROLES" | while read role; do
        if [ -n "$role" ]; then
            echo "  - $role"
        fi
    done
else
    echo -e "${YELLOW}⚠ 服務帳號沒有任何權限${NC}"
fi
echo ""

# 嘗試通過不同方法添加權限
echo "3. 嘗試添加必要權限..."

# Gemini 2.5 需要的權限
REQUIRED_ROLES=(
    "roles/aiplatform.user"
    "roles/aiplatform.serviceAgent"
    "roles/serviceusage.serviceUsageConsumer"
    "roles/ml.developer"
)

echo "嘗試自動添加權限..."
PERMISSION_SUCCESS=0

for ROLE in "${REQUIRED_ROLES[@]}"; do
    echo "嘗試添加角色: $ROLE"
    if gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$ROLE" 2>/dev/null; then
        echo -e "${GREEN}✓ 成功添加 $ROLE${NC}"
        PERMISSION_SUCCESS=$((PERMISSION_SUCCESS + 1))
    else
        echo -e "${RED}✗ 無法添加 $ROLE${NC}"
    fi
done
echo ""

# 如果自動添加失敗，提供手動指引
if [ $PERMISSION_SUCCESS -eq 0 ]; then
    echo -e "${YELLOW}自動權限設定失敗，需要手動設定${NC}"
    echo ""
    echo -e "${BLUE}請按照以下步驟手動設定：${NC}"
    echo ""
    echo "🔗 開啟 Google Cloud Console IAM 頁面："
    echo "   https://console.cloud.google.com/iam-admin/iam?project=$PROJECT_ID"
    echo ""
    echo "📝 手動設定步驟："
    echo "   1. 點擊「+ 新增」按鈕"
    echo "   2. 在「新主體」欄位輸入："
    echo "      $SERVICE_ACCOUNT_EMAIL"
    echo "   3. 在「選取角色」中搜尋並添加以下角色："
    for ROLE in "${REQUIRED_ROLES[@]}"; do
        case $ROLE in
            "roles/aiplatform.user")
                echo "      - Vertex AI 使用者 (Vertex AI User)"
                ;;
            "roles/aiplatform.serviceAgent")
                echo "      - Vertex AI 服務代理程式 (Vertex AI Service Agent)"
                ;;
            "roles/serviceusage.serviceUsageConsumer")
                echo "      - 服務使用情況消費者 (Service Usage Consumer)"
                ;;
            "roles/ml.developer")
                echo "      - AI Platform 開發者 (ML Engine Developer)"
                ;;
        esac
    done
    echo "   4. 點擊「儲存」"
    echo ""
    read -p "完成手動設定後，按 Enter 繼續..."
fi

# 測試 Gemini 2.5 存取
echo ""
echo "4. 測試 Gemini 2.5 模型存取..."

# 測試不同的模型
GEMINI_MODELS=("gemini-2.5-flash" "gemini-2.5-pro")

for MODEL in "${GEMINI_MODELS[@]}"; do
    echo "測試 $MODEL..."
    
    # 使用服務帳號認證測試
    export GOOGLE_APPLICATION_CREDENTIALS="/Users/shouian99/.config/gcloud/storycraft-service-account-key.json"
    
    # 測試 API 呼叫
    ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null)
    if [ -n "$ACCESS_TOKEN" ]; then
        RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/gemini_test_response.json \
            -X POST \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            "https://us-central1-aiplatform.googleapis.com/v1/projects/$PROJECT_ID/locations/us-central1/publishers/google/models/$MODEL:generateContent" \
            -d '{
                "contents": [{
                    "parts": [{
                        "text": "Hello, test"
                    }]
                }]
            }')
        
        HTTP_CODE="${RESPONSE: -3}"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ $MODEL 可以存取${NC}"
            WORKING_MODEL=$MODEL
        else
            echo -e "${RED}✗ $MODEL 無法存取 (HTTP $HTTP_CODE)${NC}"
            if [ -f "/tmp/gemini_test_response.json" ]; then
                ERROR_MSG=$(cat /tmp/gemini_test_response.json | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
                if [ -n "$ERROR_MSG" ]; then
                    echo "   錯誤: $ERROR_MSG"
                fi
            fi
        fi
        rm -f /tmp/gemini_test_response.json
    else
        echo -e "${RED}✗ 無法獲取存取權杖${NC}"
    fi
done
echo ""

# 更新應用程式配置
echo "5. 更新應用程式配置..."

# 重新啟用服務帳號認證
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    # 啟用服務帳號認證
    if grep -q "# GOOGLE_APPLICATION_CREDENTIALS=" "$ENV_FILE"; then
        sed -i.bak "s|# GOOGLE_APPLICATION_CREDENTIALS=|GOOGLE_APPLICATION_CREDENTIALS=|" "$ENV_FILE"
        echo -e "${GREEN}✓ 重新啟用服務帳號認證${NC}"
    fi
fi

# 設定工作模型
if [ -n "$WORKING_MODEL" ]; then
    echo -e "${GREEN}✅ 找到可用的模型: $WORKING_MODEL${NC}"
    echo "應用程式將使用 $WORKING_MODEL"
else
    echo -e "${YELLOW}⚠ 沒有找到可用的 Gemini 2.5 模型${NC}"
    echo "請確認："
    echo "1. 服務帳號權限是否正確設定"
    echo "2. Gemini 2.5 模型在您的區域是否可用"
    echo "3. 專案計費是否啟用"
fi

echo ""
echo -e "${BLUE}=== 總結 ===${NC}"
echo ""
echo "✅ 已完成設定步驟"
echo "🔄 請重新啟動開發伺服器: ./monitor-server.sh restart"
echo "🌐 測試應用程式: http://localhost:3000"
echo ""
if [ -z "$WORKING_MODEL" ]; then
    echo -e "${YELLOW}如果仍有問題，請檢查：${NC}"
    echo "1. Google Cloud Console 中的服務帳號權限"
    echo "2. 專案的 Vertex AI API 配額"
    echo "3. 區域中的模型可用性"
fi