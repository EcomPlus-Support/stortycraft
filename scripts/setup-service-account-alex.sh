#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fechen-aifactory"
USER_EMAIL="alex.liu@ecomplusco.com"
SERVICE_ACCOUNT_NAME="storycraft-ai"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
KEY_FILE="$HOME/.config/gcloud/storycraft-service-account-key.json"

echo -e "${BLUE}=== 設定 StoryCraft 服務帳號 (alex.liu@ecomplusco.com) ===${NC}"
echo -e "${BLUE}專案: $PROJECT_ID${NC}"
echo -e "${BLUE}用戶: $USER_EMAIL${NC}"
echo ""

# 確認當前用戶
CURRENT_USER=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
if [ "$CURRENT_USER" != "$USER_EMAIL" ]; then
    echo "切換到正確的帳號..."
    gcloud config set account $USER_EMAIL
fi

# 檢查專案權限
echo "1. 檢查專案權限..."
if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ 可以存取專案: $PROJECT_ID${NC}"
else
    echo -e "${RED}✗ 無法存取專案: $PROJECT_ID${NC}"
    exit 1
fi

# 檢查/創建服務帳號
echo ""
echo "2. 檢查/創建服務帳號..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ 服務帳號已存在: $SERVICE_ACCOUNT_EMAIL${NC}"
else
    echo "創建服務帳號..."
    if gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="StoryCraft AI Service Account" \
        --description="Service account for StoryCraft application to access Vertex AI" \
        --project=$PROJECT_ID; then
        echo -e "${GREEN}✓ 服務帳號創建成功${NC}"
    else
        echo -e "${RED}✗ 服務帳號創建失敗${NC}"
        exit 1
    fi
fi

# 檢查 IAM 權限
echo ""
echo "3. 檢查用戶 IAM 權限..."
USER_ROLES=$(gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:user:$USER_EMAIL" --format="value(bindings.role)" 2>/dev/null)

echo "用戶 $USER_EMAIL 的角色:"
if [ -n "$USER_ROLES" ]; then
    echo "$USER_ROLES" | while read role; do
        if [ -n "$role" ]; then
            echo "  - $role"
        fi
    done
    
    # 檢查是否有 IAM 管理權限
    if echo "$USER_ROLES" | grep -E "(roles/owner|roles/editor|roles/resourcemanager.projectIamAdmin)"; then
        CAN_MANAGE_IAM=true
        echo -e "${GREEN}✓ 用戶有 IAM 管理權限${NC}"
    else
        CAN_MANAGE_IAM=false
        echo -e "${YELLOW}⚠ 用戶沒有 IAM 管理權限${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 未找到用戶的直接 IAM 角色${NC}"
    echo "可能透過群組或組織層級獲得權限..."
    
    # 嘗試測試 IAM 權限
    echo "測試 IAM 管理權限..."
    if gcloud projects get-iam-policy $PROJECT_ID &>/dev/null; then
        CAN_MANAGE_IAM=true
        echo -e "${GREEN}✓ 可以讀取 IAM 政策${NC}"
    else
        CAN_MANAGE_IAM=false
        echo -e "${RED}✗ 無法讀取 IAM 政策${NC}"
    fi
fi

# 授予服務帳號權限
echo ""
echo "4. 授予服務帳號權限..."
REQUIRED_ROLES=(
    "roles/aiplatform.user"
    "roles/serviceusage.serviceUsageConsumer"
)

if [ "$CAN_MANAGE_IAM" = true ]; then
    for ROLE in "${REQUIRED_ROLES[@]}"; do
        echo "授予角色: $ROLE"
        if gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
            --role="$ROLE"; then
            echo -e "${GREEN}✓ 成功授予 $ROLE${NC}"
        else
            echo -e "${RED}✗ 授予 $ROLE 失敗${NC}"
        fi
    done
else
    echo -e "${YELLOW}⚠ 無法自動授予權限，需要手動設定${NC}"
    echo ""
    echo "請在 Google Cloud Console 中手動設定:"
    echo "1. 前往: https://console.cloud.google.com/iam-admin/iam?project=$PROJECT_ID"
    echo "2. 找到服務帳號: $SERVICE_ACCOUNT_EMAIL"
    echo "3. 添加以下角色:"
    for ROLE in "${REQUIRED_ROLES[@]}"; do
        echo "   - $ROLE"
    done
    echo ""
    read -p "完成後按 Enter 繼續..."
fi

# 創建/更新金鑰檔案
echo ""
echo "5. 創建服務帳號金鑰..."
mkdir -p "$(dirname "$KEY_FILE")"

# 刪除舊金鑰檔案
if [ -f "$KEY_FILE" ]; then
    rm "$KEY_FILE"
fi

if gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SERVICE_ACCOUNT_EMAIL" \
    --project=$PROJECT_ID; then
    echo -e "${GREEN}✓ 金鑰檔案創建成功: $KEY_FILE${NC}"
    chmod 600 "$KEY_FILE"
else
    echo -e "${RED}✗ 金鑰檔案創建失敗${NC}"
    exit 1
fi

# 更新 .env 檔案
echo ""
echo "6. 更新應用程式配置..."
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    # 更新 GOOGLE_APPLICATION_CREDENTIALS
    if grep -q "GOOGLE_APPLICATION_CREDENTIALS=" "$ENV_FILE"; then
        sed -i.bak "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE|" "$ENV_FILE"
    else
        echo "" >> "$ENV_FILE"
        echo "# Service Account Authentication" >> "$ENV_FILE"
        echo "GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE" >> "$ENV_FILE"
    fi
    echo -e "${GREEN}✓ .env 檔案已更新${NC}"
else
    echo -e "${YELLOW}⚠ .env 檔案不存在${NC}"
fi

# 測試服務帳號
echo ""
echo "7. 測試服務帳號權限..."

# 暫時使用服務帳號認證
ORIGINAL_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")
export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"

echo "測試 Vertex AI 存取..."
if timeout 30 gcloud auth activate-service-account --key-file="$KEY_FILE" 2>/dev/null; then
    if timeout 30 gcloud ai models list --region=us-central1 --project=$PROJECT_ID --limit=1 &>/dev/null; then
        echo -e "${GREEN}✓ 服務帳號可以存取 Vertex AI${NC}"
        SUCCESS=true
    else
        echo -e "${RED}✗ 服務帳號無法存取 Vertex AI${NC}"
        echo "可能原因:"
        echo "  - 服務帳號權限尚未生效 (需要幾分鐘)"
        echo "  - 服務帳號缺少必要權限"
        echo "  - API 配額限制"
        SUCCESS=false
    fi
else
    echo -e "${RED}✗ 服務帳號認證失敗${NC}"
    SUCCESS=false
fi

# 恢復用戶認證
gcloud config set account $ORIGINAL_ACCOUNT
echo -e "${GREEN}✓ 已恢復用戶認證 ($ORIGINAL_ACCOUNT)${NC}"

echo ""
echo -e "${BLUE}=== 設定完成 ===${NC}"
echo ""
echo "服務帳號資訊:"
echo "  名稱: $SERVICE_ACCOUNT_NAME"
echo "  電子郵件: $SERVICE_ACCOUNT_EMAIL"
echo "  金鑰檔: $KEY_FILE"
echo ""
if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}✅ 設定成功！${NC}"
    echo ""
    echo "下一步:"
    echo "1. 重新啟動開發伺服器"
    echo "2. 測試應用程式: http://localhost:3000"
else
    echo -e "${YELLOW}⚠ 設定部分完成${NC}"
    echo ""
    echo "可能需要:"
    echo "1. 等待幾分鐘讓權限生效"
    echo "2. 在 Google Cloud Console 中手動確認服務帳號權限"
    echo "3. 重新啟動開發伺服器並測試"
fi
echo ""
echo -e "${YELLOW}注意: 金鑰檔案包含敏感資訊，請妥善保管${NC}"