import { Global, Module } from '@nestjs/common';
import { PlannerService } from './planner.service.js';
import { ImageModelService } from './image-model.service.js';
import { PromptSuggestionService } from './prompt-suggestion.service.js';

@Global()
@Module({
  providers: [PlannerService, ImageModelService, PromptSuggestionService],
  exports: [PlannerService, ImageModelService, PromptSuggestionService],
})
export class ModelModule {}
