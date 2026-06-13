import type { BizConfig, BizType } from '@novacanvas/types';
export declare const generalConfig: BizConfig;
export declare const usedCarConfig: BizConfig;
export declare const fashionConfig: BizConfig;
export declare const bizConfigs: Record<BizType, BizConfig>;
export declare function getBizConfig(bizType: BizType): BizConfig;
