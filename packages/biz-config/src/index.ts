import type { BizConfig, BizType } from '@novacanvas/types';

export const generalConfig: BizConfig = {
  bizType: 'general',
  title: '通用创作',
  description: '面向产品、营销与创意团队的多轮图片生成工作台',
  enableConversation: true,
  enableMultiImage: true,
  enableImageEdit: true,
  defaultRatioOptions: ['1:1', '4:3', '3:4', '16:9', '9:16'],
  supportedSceneTypes: [
    {
      value: 'creative',
      label: '自由创作',
      description: '根据描述生成完整视觉',
      promptHint: '描述主体、环境、光线与视觉风格',
    },
    {
      value: 'product',
      label: '产品视觉',
      description: '清晰呈现产品与卖点',
      promptHint: '说明产品材质、背景和展示角度',
    },
  ],
  quickPrompts: ['生成一张干净的产品主视觉', '保留主体，把背景改得更有质感'],
};

export const usedCarConfig: BizConfig = {
  bizType: 'used_car',
  title: '二手车创意生图',
  description: '生成可信、精致且适合营销投放的车辆视觉',
  enableConversation: true,
  enableMultiImage: true,
  enableImageEdit: true,
  defaultRatioOptions: ['1:1', '4:3', '16:9', '9:16'],
  supportedSceneTypes: [
    {
      value: 'creative_poster',
      label: '营销海报',
      description: '突出车型与车身质感',
      promptHint: '说明车型卖点、画面情绪与广告用途',
    },
    {
      value: 'rainy_highway',
      label: '雨夜高架',
      description: '湿地反光与城市动感',
      promptHint: '保留车辆细节，营造雨夜高架电影感',
    },
    {
      value: 'garage',
      label: '地下车库',
      description: '硬朗灯带与空间纵深',
      promptHint: '把车辆放入现代地下车库',
    },
    {
      value: 'showroom',
      label: '精品展厅',
      description: '明亮、可信的销售展示',
      promptHint: '生成高端但真实的展厅展示图',
    },
    {
      value: 'clean_interior',
      label: '内饰焕新',
      description: '增强清洁感与材质表现',
      promptHint: '清理杂物并提升内饰材质与光线',
    },
  ],
  quickPrompts: [
    '保留车辆外观，换成雨夜高架背景',
    '把车漆调整为深海蓝，保持真实反光',
    '生成一张适合信息流投放的精品车营销图',
  ],
};

export const fashionConfig: BizConfig = {
  bizType: 'fashion',
  title: '服装灵感生图',
  description: '从款式、面料与参考视觉延展完整穿搭灵感',
  enableConversation: true,
  enableMultiImage: true,
  enableImageEdit: true,
  defaultRatioOptions: ['1:1', '3:4', '4:5', '9:16'],
  supportedSceneTypes: [
    {
      value: 'inspiration',
      label: '穿搭灵感',
      description: '围绕单品延展造型语言',
      promptHint: '说明季节、风格、配色和目标人群',
    },
    {
      value: 'lookbook',
      label: 'Lookbook',
      description: '系列化、编辑感的成片',
      promptHint: '生成品牌 Lookbook 风格画面',
    },
    {
      value: 'style_transfer',
      label: '风格迁移',
      description: '融合款式图与风格参考',
      promptHint: '保留服装版型并迁移参考图氛围',
    },
    {
      value: 'model_scene',
      label: '模特场景',
      description: '自然呈现上身效果',
      promptHint: '说明模特气质、动作和拍摄场景',
    },
    {
      value: 'fabric_mood',
      label: '面料情绪',
      description: '突出纹理、垂坠与光泽',
      promptHint: '聚焦面料细节和触感氛围',
    },
  ],
  quickPrompts: [
    '参考这件单品生成法式轻奢夏日穿搭',
    '保持服装版型，改成极简杂志 Lookbook 风格',
    '结合款式图和氛围图，生成自然街拍场景',
  ],
};

export const bizConfigs: Record<BizType, BizConfig> = {
  general: generalConfig,
  used_car: usedCarConfig,
  fashion: fashionConfig,
  ecommerce: { ...generalConfig, bizType: 'ecommerce', title: '电商商品图' },
  poster: { ...generalConfig, bizType: 'poster', title: '营销海报' },
};

export function getBizConfig(bizType: BizType): BizConfig {
  return bizConfigs[bizType] ?? generalConfig;
}
