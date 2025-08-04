#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="fechen-aifactory"
SERVICE_ACCOUNT_NAME="storycraft-ai"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
KEY_FILE="$HOME/.config/gcloud/storycraft-service-account-key.json"

echo -e "${BLUE}=== 設定 StoryCraft 服務帳號 ===${NC}"
echo -e "${BLUE}專案: $PROJECT_ID${NC}"
echo ""

# 創建服務帳號
echo "1. 創建服務帳號..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL --project=$PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓ 服務帳號已存在: $SERVICE_ACCOUNT_EMAIL${NC}"
else
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
echo ""

# 授予權限
echo "2. 授予必要權限..."
REQUIRED_ROLES=(
    "roles/aiplatform.user"
    "roles/serviceusage.serviceUsageConsumer"
)

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
echo ""

# 創建金鑰檔案
echo "3. 創建服務帳號金鑰..."
mkdir -p "$(dirname "$KEY_FILE")"
if gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account="$SERVICE_ACCOUNT_EMAIL" \
    --project=$PROJECT_ID; then
    echo -e "${GREEN}✓ 金鑰檔案創建成功: $KEY_FILE${NC}"
    chmod 600 "$KEY_FILE"
else
    echo -e "${RED}✗ 金鑰檔案創建失敗${NC}"
    exit 1
fi
echo ""

# 更新 .env 檔案
echo "4. 更新應用程式配置..."
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
    # 加入 GOOGLE_APPLICATION_CREDENTIALS
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
echo ""

# 測試服務帳號
echo "5. 測試服務帳號權限..."
export GOOGLE_APPLICATION_CREDENTIALS="$KEY_FILE"

# 測試認證
echo "測試認證..."
if gcloud auth activate-service-account --key-file="$KEY_FILE"; then
    echo -e "${GREEN}✓ 服務帳號認證成功${NC}"
else
    echo -e "${RED}✗ 服務帳號認證失敗${NC}"
    exit 1
fi

# 測試 Vertex AI 存取
echo "測試 Vertex AI 存取..."
if gcloud ai models list --region=us-central1 --project=$PROJECT_ID --limit=1 &>/dev/null; then
    echo -e "${GREEN}✓ 服務帳號可以存取 Vertex AI${NC}"
else
    echo -e "${RED}✗ 服務帳號無法存取 Vertex AI${NC}"
fi
echo ""

# 恢復用戶認證
echo "6. 恢復用戶認證..."
gcloud config set account shouian99@gmail.com
echo -e "${GREEN}✓ 已恢復用戶認證${NC}"
echo ""

echo -e "${BLUE}=== 設定完成 ===${NC}"
echo ""
echo "服務帳號資訊:"
echo "  名稱: $SERVICE_ACCOUNT_NAME"
echo "  電子郵件: $SERVICE_ACCOUNT_EMAIL"
echo "  金鑰檔: $KEY_FILE"
echo ""
echo "下一步:"
echo "1. 重新啟動開發伺服器: npm run dev"
echo "2. 測試應用程式: http://localhost:3000"
echo ""
echo -e "${YELLOW}注意: 金鑰檔案包含敏感資訊，請妥善保管${NC}"