#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fechen-aifactory"

echo -e "${BLUE}=== Vertex AI API 權限檢查 ===${NC}"
echo -e "${BLUE}專案: $PROJECT_ID${NC}"
echo ""

# 檢查當前認證用戶
echo "1. 檢查當前認證用戶..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if [ -n "$ACTIVE_ACCOUNT" ]; then
    echo -e "${GREEN}✓ 當前用戶: $ACTIVE_ACCOUNT${NC}"
else
    echo -e "${RED}✗ 未找到活動用戶${NC}"
    exit 1
fi
echo ""

# 檢查專案存取權限
echo "2. 檢查專案存取權限..."
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    PROJECT_NAME=$(gcloud projects describe $PROJECT_ID --format="value(name)" 2>/dev/null)
    echo -e "${GREEN}✓ 可以存取專案${NC}"
    echo "  專案名稱: $PROJECT_NAME"
else
    echo -e "${RED}✗ 無法存取專案 $PROJECT_ID${NC}"
    echo "請檢查專案ID是否正確，或者您是否有存取權限"
    exit 1
fi
echo ""

# 檢查已啟用的API
echo "3. 檢查已啟用的API..."
echo "Vertex AI 相關的API:"

VERTEX_APIS=(
    "aiplatform.googleapis.com:Vertex AI API"
    "ml.googleapis.com:AI Platform (舊版)"
    "storage.googleapis.com:Google Cloud Storage"
    "serviceusage.googleapis.com:Service Usage API"
)

for API_INFO in "${VERTEX_APIS[@]}"; do
    API_NAME=$(echo $API_INFO | cut -d':' -f1)
    API_DESC=$(echo $API_INFO | cut -d':' -f2)
    
    if gcloud services list --enabled --project=$PROJECT_ID --filter="name:$API_NAME" --format="value(name)" | grep -q "$API_NAME"; then
        echo -e "${GREEN}✓ $API_DESC ($API_NAME)${NC}"
    else
        echo -e "${RED}✗ $API_DESC ($API_NAME) - 未啟用${NC}"
    fi
done
echo ""

# 檢查IAM權限
echo "4. 檢查IAM權限..."
echo "檢查用戶 $ACTIVE_ACCOUNT 的權限:"

# 獲取用戶的所有角色
USER_ROLES=$(gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:user:$ACTIVE_ACCOUNT" --format="value(bindings.role)" 2>/dev/null)

if [ -n "$USER_ROLES" ]; then
    echo "用戶角色列表:"
    echo "$USER_ROLES" | while read role; do
        if [ -n "$role" ]; then
            echo "  - $role"
        fi
    done
else
    echo -e "${RED}✗ 未找到任何IAM角色${NC}"
fi
echo ""

# 檢查特定的Vertex AI權限
echo "5. 檢查特定的Vertex AI權限..."

VERTEX_ROLES=(
    "roles/aiplatform.user:Vertex AI 使用者"
    "roles/aiplatform.admin:Vertex AI 管理員"
    "roles/ml.admin:ML Engine 管理員"
    "roles/ml.developer:ML Engine 開發者"
    "roles/serviceusage.serviceUsageConsumer:服務使用消費者"
)

for ROLE_INFO in "${VERTEX_ROLES[@]}"; do
    ROLE_NAME=$(echo $ROLE_INFO | cut -d':' -f1)
    ROLE_DESC=$(echo $ROLE_INFO | cut -d':' -f2)
    
    if echo "$USER_ROLES" | grep -q "$ROLE_NAME"; then
        echo -e "${GREEN}✓ $ROLE_DESC ($ROLE_NAME)${NC}"
    else
        echo -e "${YELLOW}- $ROLE_DESC ($ROLE_NAME) - 未指派${NC}"
    fi
done
echo ""

# 檢查計費狀態
echo "6. 檢查計費狀態..."
BILLING_INFO=$(gcloud billing projects describe $PROJECT_ID 2>/dev/null)
if [ $? -eq 0 ]; then
    BILLING_ENABLED=$(echo "$BILLING_INFO" | grep "billingEnabled:" | awk '{print $2}')
    if [ "$BILLING_ENABLED" = "true" ]; then
        BILLING_ACCOUNT=$(echo "$BILLING_INFO" | grep "billingAccountName:" | awk '{print $2}')
        echo -e "${GREEN}✓ 計費已啟用${NC}"
        echo "  計費帳戶: $BILLING_ACCOUNT"
    else
        echo -e "${RED}✗ 計費未啟用${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 無法檢查計費狀態${NC}"
fi
echo ""

# 測試Vertex AI存取
echo "7. 測試Vertex AI API存取..."
echo "嘗試列出可用的模型..."

if gcloud ai models list --region=us-central1 --project=$PROJECT_ID --limit=1 &>/dev/null; then
    echo -e "${GREEN}✓ 可以存取Vertex AI API${NC}"
    echo "可用的模型:"
    gcloud ai models list --region=us-central1 --project=$PROJECT_ID --limit=5 --format="table(name,displayName)" 2>/dev/null || echo "  無法列出模型詳細資訊"
else
    echo -e "${RED}✗ 無法存取Vertex AI API${NC}"
    echo "這可能是因為："
    echo "  - API未啟用"
    echo "  - 權限不足"
    echo "  - 計費未啟用"
fi
echo ""

# 檢查Application Default Credentials
echo "8. 檢查Application Default Credentials..."
if gcloud auth application-default print-access-token &>/dev/null; then
    echo -e "${GREEN}✓ ADC已配置${NC}"
    ADC_ACCOUNT=$(gcloud auth application-default print-access-token | head -c 50)
    echo "  Token前綴: ${ADC_ACCOUNT}..."
else
    echo -e "${RED}✗ ADC未配置${NC}"
    echo "  請執行: gcloud auth application-default login"
fi
echo ""

# 總結和建議
echo -e "${BLUE}=== 總結和建議 ===${NC}"
echo ""

# 檢查是否所有必要條件都滿足
ISSUES_FOUND=0

# 檢查API是否啟用
if ! gcloud services list --enabled --project=$PROJECT_ID --filter="name:aiplatform.googleapis.com" --format="value(name)" | grep -q "aiplatform.googleapis.com"; then
    echo -e "${RED}問題: Vertex AI API未啟用${NC}"
    echo "解決方案: gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# 檢查權限
if ! echo "$USER_ROLES" | grep -E "(roles/aiplatform\.|roles/ml\.)"; then
    echo -e "${RED}問題: 缺少Vertex AI相關權限${NC}"
    echo "解決方案: gcloud projects add-iam-policy-binding $PROJECT_ID --member=\"user:$ACTIVE_ACCOUNT\" --role=\"roles/aiplatform.user\""
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# 檢查計費
if [ "$BILLING_ENABLED" != "true" ]; then
    echo -e "${RED}問題: 計費未啟用${NC}"
    echo "解決方案: 在Google Cloud Console中啟用計費"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✓ 所有檢查都通過！您的專案應該可以使用Vertex AI${NC}"
else
    echo -e "${YELLOW}發現 $ISSUES_FOUND 個問題需要解決${NC}"
    echo ""
    echo "快速修復指令:"
    echo "./scripts/diagnose-and-fix-gcp.sh"
fi