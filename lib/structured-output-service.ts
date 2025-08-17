import { GeminiDirectService } from './gemini-direct';

// Define ContentQuality type
type ContentQuality = 'full' | 'partial' | 'metadata-only';

// Import ProcessingStage from process-reference
import { ProcessingStage, ProcessingError } from '../app/actions/process-reference';

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
  processingError?: ProcessingError;
}

export class StructuredOutputService {
  constructor(private geminiService: GeminiDirectService) {}

  async generateStructuredPitch(
    sourceContent: string,
    contentQuality: ContentQuality
  ): Promise<StructuredPitch | null> {
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Structured output attempt ${attempts}/${maxAttempts}`);
      
      try {
        // 階段 1：生成角色資料
        const characters = await this.generateCharactersWithFallback(sourceContent, contentQuality);
        
        // 階段 2：生成場景描述 
        const scenes = await this.generateScenesWithFallback(sourceContent, characters, contentQuality);
        
        // 階段 3：組合成最終 pitch
        const structuredPitch = await this.compileFinalPitchWithFallback(
          sourceContent,
          characters,
          scenes,
          contentQuality
        );
        
        if (structuredPitch && structuredPitch.finalPitch && structuredPitch.finalPitch.length > 50) {
          console.log('✅ Structured output generation successful');
          return structuredPitch;
        } else {
          console.log('⚠️ Structured output incomplete, retrying...');
          if (attempts === maxAttempts) {
            return this.createFallbackStructuredPitch(sourceContent, characters, scenes);
          }
        }
      } catch (error) {
        console.error(`❌ Structured output attempt ${attempts} failed:`, error);
        if (attempts === maxAttempts) {
          console.log('🔄 Falling back to basic structured pitch');
          return this.createFallbackStructuredPitch(sourceContent, [], []);
        }
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  }

  private async generateCharactersWithFallback(
    sourceContent: string,
    contentQuality: ContentQuality
  ): Promise<CharacterProfile[]> {
    // 使用更簡短的 prompt 來避免 token 超限
    const shortContent = sourceContent.length > 500 ? sourceContent.substring(0, 500) + '...' : sourceContent;
    
    const prompt = `分析內容創建1-2個角色。必須是有效JSON：
內容：${shortContent}

輸出格式：
{"characters":[{"name":"角色名","age":25,"gender":"男性","voice":"沉穩","appearance":"簡短外貌","personality":"主要性格","motivation":"核心目標"}]}

要求：角色名2-3字，年齡20-50，描述簡潔`;

    try {
      const response = await this.geminiService.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 2000 // 充足的 token 分配
      });

      const parsed = JSON.parse(this.recoverTruncatedJson(response, 'characters'));
      if (parsed.characters && parsed.characters.length > 0) {
        return parsed.characters;
      }
    } catch (error) {
      console.error('Error generating characters:', error);
    }
    
    // 返回預設角色
    return this.getDefaultCharacters(shortContent);
  }
  
  private async generateCharacters(
    sourceContent: string,
    contentQuality: ContentQuality
  ): Promise<CharacterProfile[]> {
    return this.generateCharactersWithFallback(sourceContent, contentQuality);
  }

  private async generateScenesWithFallback(
    sourceContent: string,
    characters: CharacterProfile[],
    contentQuality: ContentQuality
  ): Promise<SceneDescription[]> {
    const mainChar = characters[0]?.name || '主角';
    const shortContent = sourceContent.length > 300 ? sourceContent.substring(0, 300) + '...' : sourceContent;
    
    const prompt = `為${mainChar}創建3-4個簡短場景。必須JSON格式：
內容：${shortContent}

輸出：
{"scenes":[{"sceneNumber":1,"location":"地點","timeOfDay":"早晨","atmosphere":"氛圍","keyAction":"動作","emotionalTone":"情緒","visualElements":["元素1"],"duration":20}]}

要求：簡潔描述，總共60-90秒`;

    try {
      const response = await this.geminiService.generateText(prompt, {
        temperature: 0.6,
        maxTokens: 2000 // 充足的 token 分配
      });

      const parsed = JSON.parse(this.recoverTruncatedJson(response, 'scenes'));
      if (parsed.scenes && parsed.scenes.length > 0) {
        return parsed.scenes;
      }
    } catch (error) {
      console.error('Error generating scenes:', error);
    }
    
    return this.generateDefaultScenes();
  }
  
  private async generateScenes(
    sourceContent: string,
    characters: CharacterProfile[],
    contentQuality: ContentQuality
  ): Promise<SceneDescription[]> {
    return this.generateScenesWithFallback(sourceContent, characters, contentQuality);
  }

  private async compileFinalPitchWithFallback(
    sourceContent: string,
    characters: CharacterProfile[],
    scenes: SceneDescription[],
    contentQuality: ContentQuality
  ): Promise<StructuredPitch> {
    const mainCharacter = characters[0];
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
    const shortContent = sourceContent.substring(0, 200);
    
    const prompt = `創建故事大綱。JSON格式：
內容：${shortContent}
主角：${mainCharacter?.name || '主角'}

輸出：
{"title":"標題","genre":"劇情片","targetAudience":"一般觀眾","coreMessage":"核心訊息","finalPitch":"完整故事（150字內，包含主角名字）","tags":["標籤1","標籤2"]}`;

    try {
      const response = await this.geminiService.generateText(prompt, {
        temperature: 0.7,
        maxTokens: 2000 // 充足的 token 分配避免截斷
      });

      const parsed = JSON.parse(this.recoverTruncatedJson(response, 'finalPitch'));
      return {
        title: parsed.title || '故事大綱',
        genre: parsed.genre || '劇情片',
        targetAudience: parsed.targetAudience || '一般觀眾',
        coreMessage: parsed.coreMessage || shortContent.substring(0, 30),
        characters,
        scenes,
        finalPitch: parsed.finalPitch || this.generateFallbackPitch(characters, scenes),
        estimatedDuration: totalDuration,
        tags: parsed.tags || ['故事', '戲劇']
      };
    } catch (error) {
      console.error('Error generating final pitch:', error);
      return this.createFallbackStructuredPitch(sourceContent, characters, scenes);
    }
  }
  
  private async compileFinalPitch(
    sourceContent: string,
    characters: CharacterProfile[],
    scenes: SceneDescription[],
    contentQuality: ContentQuality
  ): Promise<StructuredPitch> {
    return this.compileFinalPitchWithFallback(sourceContent, characters, scenes, contentQuality);
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
  
  /**
   * 嘗試恢復截斷的 JSON 回應
   */
  private recoverTruncatedJson(response: string, expectedKey: string): any {
    let cleaned = this.cleanJsonResponse(response);
    
    // 如果 JSON 不完整，嘗試修復
    if (!cleaned.endsWith('}')) {
      // 尋找最後一個完整的物件/陣列
      const lastCompleteObject = this.findLastCompleteStructure(cleaned);
      if (lastCompleteObject) {
        cleaned = lastCompleteObject;
      } else {
        // 如果無法修復，就在結尾加上缺少的括號
        cleaned += this.generateMissingBraces(cleaned);
      }
    }
    
    try {
      const parsed = JSON.parse(cleaned);
      // 確保有預期的 key
      if (!parsed[expectedKey]) {
        parsed[expectedKey] = this.getDefaultValueForKey(expectedKey);
      }
      return parsed;
    } catch (error) {
      console.warn('JSON recovery failed, using fallback:', error);
      return { [expectedKey]: this.getDefaultValueForKey(expectedKey) };
    }
  }
  
  private findLastCompleteStructure(json: string): string | null {
    // 嘗試找到最後一個完整的物件或陣列
    const openBraces = json.match(/\{/g)?.length || 0;
    const closeBraces = json.match(/\}/g)?.length || 0;
    const openBrackets = json.match(/\[/g)?.length || 0;
    const closeBrackets = json.match(/\]/g)?.length || 0;
    
    let result = json;
    
    // 如果缺少右大括號
    while (openBraces > closeBraces + (result.match(/\}/g)?.length || 0)) {
      result += '}';
    }
    
    // 如果缺少右中括號
    while (openBrackets > closeBrackets + (result.match(/\]/g)?.length || 0)) {
      result += ']';
    }
    
    return result;
  }
  
  private generateMissingBraces(json: string): string {
    const openBraces = json.match(/\{/g)?.length || 0;
    const closeBraces = json.match(/\}/g)?.length || 0;
    const openBrackets = json.match(/\[/g)?.length || 0;
    const closeBrackets = json.match(/\]/g)?.length || 0;
    
    let missing = '';
    
    // 新增缺少的右中括號
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      missing += ']';
    }
    
    // 新增缺少的右大括號
    for (let i = 0; i < openBraces - closeBraces; i++) {
      missing += '}';
    }
    
    return missing;
  }
  
  private getDefaultValueForKey(key: string): any {
    switch (key) {
      case 'characters':
        return this.getDefaultCharacters('');
      case 'scenes':
        return this.generateDefaultScenes();
      case 'finalPitch':
        return '基於提供的內容，創建了一個引人入勝的故事。';
      default:
        return null;
    }
  }
  
  /**
   * 創建預設角色 - 基於實際內容
   */
  private getDefaultCharacters(content: string): CharacterProfile[] {
    // 嘗試從內容中提取關鍵資訊
    const hasProduct = content.includes('產品') || content.includes('商品') || content.includes('亞馬遜');
    const hasLife = content.includes('人生') || content.includes('生活') || content.includes('時間');
    const hasComedy = content.includes('搞笑') || content.includes('爆笑') || content.includes('😂');
    
    if (hasProduct) {
      return [{
        name: '電商達人',
        age: 32,
        gender: '男性',
        voice: '熱情',
        appearance: '專業裝扮，自信的表情',
        personality: '分析力強，善於發現商機',
        motivation: '揭露電商秘密，幫助創業者'
      }];
    } else if (hasLife) {
      return [{
        name: '思考者',
        age: 35,
        gender: '女性',
        voice: '溫和',
        appearance: '知性打扮，深思的表情',
        personality: '理性且富有哲思',
        motivation: '探索人生的意義與價值'
      }];
    } else if (hasComedy) {
      return [{
        name: '觀察家',
        age: 25,
        gender: '非二元',
        voice: '活潑',
        appearance: '休閒裝扮，驚訝的表情',
        personality: '幽默風趣，善於發現生活趣事',
        motivation: '分享歡笑，傳遞快樂'
      }];
    }
    
    // 通用預設
    return [{
      name: '探索者',
      age: 30,
      gender: '男性',
      voice: '沉穩',
      appearance: '現代都市裝扮',
      personality: '好奇且勇於嘗試',
      motivation: '探索未知，分享發現'
    }];
  }
  
  /**
   * 創建失敗結構化 Pitch - 顯示失敗信息
   */
  private createFailureStructuredPitch(
    sourceContent: string,
    stage: ProcessingStage,
    errorMessage: string
  ): StructuredPitch {
    return {
      title: '結構化生成失敗',
      genre: '錯誤',
      targetAudience: '系統管理員',
      coreMessage: `在 ${stage} 階段失敗`,
      characters: [],
      scenes: [],
      finalPitch: `處理階段失敗：${stage}\n\n原因：${errorMessage}\n\n原始內容：\n${sourceContent}`,
      estimatedDuration: 0,
      tags: ['錯誤'],
      processingError: {
        stage,
        message: errorMessage,
        originalContent: sourceContent
      }
    };
  }

  /**
   * 創建後備結構化 Pitch - 基於實際內容 (保留作為備用)
   */
  private createFallbackStructuredPitch(
    sourceContent: string,
    characters: CharacterProfile[],
    scenes: SceneDescription[]
  ): StructuredPitch {
    const validCharacters = characters.length > 0 ? characters : this.getDefaultCharacters(sourceContent);
    const validScenes = scenes.length > 0 ? scenes : this.generateDefaultScenes();
    const totalDuration = validScenes.reduce((sum, scene) => sum + scene.duration, 0);
    
    // 從內容中提取關鍵信息
    const hasProduct = sourceContent.includes('產品') || sourceContent.includes('商品');
    const hasLife = sourceContent.includes('人生') || sourceContent.includes('時間');
    const hasComedy = sourceContent.includes('搞笑') || sourceContent.includes('爆笑');
    
    // 根據內容類型生成相應的標題和類型
    let title = '精彩故事';
    let genre = '劇情片';
    let targetAudience = '一般觀眾';
    let tags = ['故事'];
    
    if (hasProduct) {
      title = '電商揭秘故事';
      genre = '商業紀實';
      targetAudience = '創業者和電商從業者';
      tags = ['電商', '創業', '商業'];
    } else if (hasLife) {
      title = '人生思考之旅';
      genre = '哲理短片';
      targetAudience = '追求人生意義的觀眾';
      tags = ['人生', '哲理', '思考'];
    } else if (hasComedy) {
      title = '爆笑生活觀察';
      genre = '喜劇短片';
      targetAudience = '喜歡輕鬆娛樂的觀眾';
      tags = ['搞笑', '娛樂', '生活'];
    }
    
    // 提取實際的核心訊息
    const coreMessage = sourceContent.length > 100 
      ? sourceContent.substring(0, 100) + '...'
      : sourceContent || '一個值得分享的故事';
    
    return {
      title,
      genre,
      targetAudience,
      coreMessage,
      characters: validCharacters,
      scenes: validScenes,
      finalPitch: this.generateFallbackPitch(validCharacters, validScenes, sourceContent),
      estimatedDuration: totalDuration,
      tags
    };
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
    scenes: SceneDescription[],
    sourceContent?: string
  ): string {
    if (characters.length === 0 || scenes.length === 0) {
      // 如果有原始內容，基於內容生成 pitch
      if (sourceContent) {
        if (sourceContent.includes('產品') || sourceContent.includes('亞馬遜')) {
          return '這是一個揭露電商產業秘密的故事，專業分析師將帶你深入了解產品背後的利潤真相，' +
                 '讓創業者和消費者都能更明智地做出決策。透過數據和實例，揭開商業世界的神秘面紗。';
        } else if (sourceContent.includes('人生') || sourceContent.includes('時間')) {
          return '這是一個關於時間與人生的深刻思考，透過獨特的視角重新審視我們的生命旅程，' +
                 '引導觀眾思考什麼才是真正重要的事物，以及如何更有意義地度過每一天。';
        } else if (sourceContent.includes('搞笑') || sourceContent.includes('😂')) {
          return '這是一個充滿驚喜和歡笑的發現之旅，主角將帶領觀眾發現生活中那些令人噴飯的巧合和趣事，' +
                 '用幽默的方式展現日常生活中的荒謬與美好。';
        }
      }
      return '這是一個引人入勝的故事，探索主角在面對挑戰時的成長與變化。透過精彩的情節和角色發展，觀眾將被帶入一段難忘的故事之旅。';
    }
    
    const mainChar = characters[0];
    const firstScene = scenes[0];
    const lastScene = scenes[scenes.length - 1];
    
    // 根據角色類型生成更相關的 pitch
    if (mainChar.name === '電商達人') {
      return `故事講述${mainChar.age}歲的${mainChar.name}，以專業的眼光分析市場現象。` +
             `從${firstScene?.location || '數據分析'}開始，透過實際案例和數字對比，` +
             `揭露${lastScene?.emotionalTone || '驚人'}的商業真相。` +
             `這是一個關於${mainChar.motivation}的實用故事。`;
    } else if (mainChar.name === '思考者') {
      return `故事跟隨${mainChar.age}歲的${mainChar.name}，展開一場內心的探索之旅。` +
             `從${firstScene?.emotionalTone || '平靜'}的思考開始，` +
             `逐步深入生命的本質問題，最終在${lastScene?.location || '內心深處'}找到答案。` +
             `這是一個關於${mainChar.motivation}的哲思故事。`;
    } else if (mainChar.name === '觀察家') {
      return `跟著${mainChar.age}歲的${mainChar.name}，發現生活中的爆笑時刻！` +
             `從${firstScene?.location || '日常場景'}的${firstScene?.emotionalTone || '平凡'}瞬間開始，` +
             `透過獨特的觀察角度，發現令人捧腹的巧合與趣事。` +
             `這是一個關於${mainChar.motivation}的歡樂故事。`;
    }
    
    // 通用版本
    return `故事講述${mainChar.age}歲的${mainChar.name}，` +
           `從${firstScene?.location || '起始場景'}的${firstScene?.emotionalTone || '關鍵'}時刻開始，` +
           `經歷了一系列挑戦，最終在${lastScene?.location || '終點'}達到新的境界。` +
           `這是一個關於${mainChar.motivation}的精彩故事。`;
  }
}