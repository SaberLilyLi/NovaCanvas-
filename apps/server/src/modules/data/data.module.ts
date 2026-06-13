import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DataService } from './data.service.js';

@Global()
@Module({
  providers: [PrismaService, DataService],
  exports: [DataService, PrismaService],
})
export class DataModule {}
