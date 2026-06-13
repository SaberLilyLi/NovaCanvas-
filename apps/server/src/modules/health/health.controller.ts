import { Controller, Get } from '@nestjs/common';
import { maxImageResolutionCap, parseImageResolutionCap } from '@novacanvas/types';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'novacanvas-server',
      runtime: process.env.NOVACANVAS_RUNTIME ?? 'mock',
      dataRuntime: process.env.NOVACANVAS_DATA_RUNTIME ?? 'memory',
      queueRuntime: process.env.NOVACANVAS_QUEUE_RUNTIME ?? 'memory',
      imageMaxResolution: maxImageResolutionCap(
        parseImageResolutionCap(process.env.OPENAI_IMAGE_MAX_RESOLUTION ?? '2k'),
        parseImageResolutionCap(process.env.DOUBAO_IMAGE_MAX_RESOLUTION ?? '2k'),
      ),
      timestamp: new Date().toISOString(),
    };
  }
}
