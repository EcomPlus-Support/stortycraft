import { GeminiDirectService } from './gemini-direct';

// Define ContentQuality type
type ContentQuality = 'full' | 'partial' | 'metadata-only';

// 定義結構化資料的介面
export interface CharacterProfile {
  name: string;
  age: number;
  gender: '男性' | '女性' | '非二元';
  voice: '溫和' | '活潑' | '沉穩' | '熱情' | '神秘';
  appearance: string;
  personality: string;
  motivation: string;
}

export interface SceneDescription {
  sceneNumber: number;
  location: string;
  timeOfDay: '早晨' | '中午' | '下午' | '傍晚' | '夜晚';
  atmosphere: string;
  keyAction: string;
  emotionalTone: string;
  visualElements: string[];
  duration: number; // 秒數
}

export interface StructuredPitch {
  title: string;
  genre: string;
  targetAudience: string;
  coreMessage: string;
  characters: CharacterProfile[];
  scenes: SceneDescription[];
  finalPitch: string;
  estimatedDuration: number;
  tags?: string[];
}

export class StructuredOutputService {
  constructor(private geminiService: GeminiDirectService) {}

  async generateStructuredPitch(
    sourceContent: string,
    contentQuality: ContentQuality
  ): Promise<StructuredPitch> {
    try {
      // 階段 1：生成角色資料
      const characters = await this.generateCharacters(sourceContent, contentQuality);
      
      // 階段 2：生成場景描述
      const scenes = await this.generateScenes(sourceContent, characters, contentQuality);
      
      // 階段 3：組合成最終 pitch
      const structuredPitch = await this.compileFinalPitch(
        sourceContent,
        characters,
        scenes,
        contentQuality
      );
      
      return structuredPitch;
    } catch (error) {
      console.error('Error in structured output generation:', error);
      throw error;
    }
  }

  private async generateCharacters(
    sourceContent: string,
    contentQuality: ContentQuality
  ): Promise<CharacterProfile[]> {
    const prompt = `
分析以下內容並為故事創建詳細的角色設定。每個角色都需要具體的描述。

內容：
${sourceContent}

請生成角色設定，必須包含：
1. 主角（1位）
2. 重要配角（1-2位）

輸出必須是有效的 JSON 格式，嚴格遵循以下結構：
{
  "characters": [
    {
      "name": "角色名稱（2-4個字）",
      "age": 年齡數字（10-80之間）,
      "gender": "男性"或"女性"或"非二元"（只能選擇其中一個）,
      "voice": "溫和"或"活潑"或"沉穩"或"熱情"或"神秘"（只能選擇其中一個）,
      "appearance": "詳細外貌描述，包含身高體型、髮型髮色、服裝風格、特徵等（50字以內）",
      "personality": "性格特徵，包含主要性格和次要特點（30字以內）",
      "motivation": "角色的核心動機或目標（20字以內）"
    }
  ]
}

重要提示：
- 角色設定要符合故事背景和主題
- 外貌描述要具體且視覺化
- 年齡要合理（不要都是同年齡）
- 性格要立體，有優點也有缺點
`;

    const response = await this.geminiService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 2000
    });

    try {
      const parsed = JSON.parse(this.cleanJsonResponse(response));
      return parsed.characters || [];
    } catch (error) {
      console.error('Error parsing characters:', error);
      // 返回預設角色
      return [{
        name: '主角',
        age: 30,
        gender: '男性',
        voice: '沉穩',
        appearance: '中等身材，深色西裝，眼神堅定',
        personality: '專業但內心焦慮',
        motivation: '在困境中尋找出路'
      }];
    }
  }

  private async generateScenes(
    sourceContent: string,
    characters: CharacterProfile[],
    contentQuality: ContentQuality
  ): Promise<SceneDescription[]> {
    const characterSummary = characters.map(c => 
      `${c.name}（${c.age}歲${c.gender}）`
    ).join('、');

    const prompt = `
基於以下內容和角色，創建 6-8 個精簡的場景描述。

內容：
${sourceContent}

角色：${characterSummary}

請生成場景列表，每個場景必須簡潔有力（1-2句話描述動作）。

輸出必須是有效的 JSON 格式：
{
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "具體地點（如：都市辦公大樓會議室）",
      "timeOfDay": "早晨"或"中午"或"下午"或"傍晚"或"夜晚",
      "atmosphere": "環境氛圍描述（20字以內）",
      "keyAction": "主要動作或事件（30字以內，一句話）",
      "emotionalTone": "情緒基調（如：緊張、希望、絕望、溫馨）",
      "visualElements": ["視覺元素1", "視覺元素2", "視覺元素3"],
      "duration": 秒數（15-30之間）
    }
  ]
}

要求：
- 場景要有起承轉合的敘事結構
- keyAction 必須簡潔，只描述最重要的動作
- 總時長控制在 2-3 分鐘（120-180秒）
`;

    const response = await this.geminiService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 3000
    });

    try {
      const parsed = JSON.parse(this.cleanJsonResponse(response));
      return parsed.scenes || [];
    } catch (error) {
      console.error('Error parsing scenes:', error);
      // 返回預設場景
      return this.generateDefaultScenes();
    }
  }

  private async compileFinalPitch(
    sourceContent: string,
    characters: CharacterProfile[],
    scenes: SceneDescription[],
    contentQuality: ContentQuality
  ): Promise<StructuredPitch> {
    const mainCharacter = characters[0];
    const sceneCount = scenes.length;
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

    const prompt = `
基於以下資訊，生成一個精簡但完整的故事大綱（繁體中文）。

原始內容：
${sourceContent}

主角：${mainCharacter.name}，${mainCharacter.age}歲${mainCharacter.gender}，${mainCharacter.appearance}

場景數量：${sceneCount}個
總時長：${totalDuration}秒

請生成最終的結構化故事大綱：
{
  "title": "吸引人的標題（10字以內）",
  "genre": "類型（如：劇情片、紀錄片、教育片）",
  "targetAudience": "目標觀眾（如：青少年、成年人、家庭觀眾）",
  "coreMessage": "核心訊息（30字以內）",
  "finalPitch": "完整故事大綱（200字以內，要包含主角名字和關鍵情節）",
  "tags": ["標籤1", "標籤2", "標籤3"]
}

要求：
- finalPitch 必須流暢自然，像是在說故事
- 要明確提到主角的名字和特徵
- 情節要緊湊，突出戲劇張力
- 使用繁體中文，語言要生動
`;

    const response = await this.geminiService.generateText(prompt, {
      temperature: 0.8,
      maxOutputTokens: 1500
    });

    try {
      const parsed = JSON.parse(this.cleanJsonResponse(response));
      return {
        ...parsed,
        characters,
        scenes,
        estimatedDuration: totalDuration
      };
    } catch (error) {
      console.error('Error parsing final pitch:', error);
      // 返回基本結構
      return {
        title: '無題',
        genre: '劇情片',
        targetAudience: '一般觀眾',
        coreMessage: sourceContent.substring(0, 30),
        characters,
        scenes,
        finalPitch: this.generateFallbackPitch(characters, scenes),
        estimatedDuration: totalDuration,
        tags: ['故事', '戲劇', '生活']
      };
    }
  }

  private cleanJsonResponse(response: string): string {
    // 移除可能的 markdown 標記
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // 移除可能的 BOM 或特殊字符
    cleaned = cleaned.replace(/^\uFEFF/, '');
    
    // 嘗試找到 JSON 物件的開始和結束
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
    
    return cleaned.trim();
  }

  private generateDefaultScenes(): SceneDescription[] {
    return [
      {
        sceneNumber: 1,
        location: '都市辦公室',
        timeOfDay: '早晨',
        atmosphere: '忙碌而充滿活力',
        keyAction: '主角自信地進入辦公室',
        emotionalTone: '積極',
        visualElements: ['現代辦公空間', '晨光', '忙碌的同事'],
        duration: 20
      },
      {
        sceneNumber: 2,
        location: '會議室',
        timeOfDay: '中午',
        atmosphere: '緊張的商業氛圍',
        keyAction: '重要會議進行中',
        emotionalTone: '緊張',
        visualElements: ['投影螢幕', '商業圖表', '專注的面孔'],
        duration: 25
      },
      {
        sceneNumber: 3,
        location: '個人辦公桌',
        timeOfDay: '下午',
        atmosphere: '突如其來的寂靜',
        keyAction: '收到改變一切的消息',
        emotionalTone: '震驚',
        visualElements: ['電腦螢幕', '空蕩的辦公室', '散落的文件'],
        duration: 20
      }
    ];
  }

  private generateFallbackPitch(
    characters: CharacterProfile[],
    scenes: SceneDescription[]
  ): string {
    const mainChar = characters[0];
    const firstScene = scenes[0];
    const lastScene = scenes[scenes.length - 1];
    
    return `故事講述${mainChar.age}歲的${mainChar.name}，` +
           `從${firstScene.location}的${firstScene.emotionalTone}時刻開始，` +
           `經歷了一系列挑戰，最終在${lastScene.location}面對人生的轉折。` +
           `這是一個關於${mainChar.motivation}的動人故事。`;
  }
}