import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Bot } from './models/bot.model';
import { BotUpdate } from './bot.update';

@Module({
  imports: [SequelizeModule.forFeature([Bot])],
  providers: [BotService,BotUpdate],
  exports: [BotService],
})
export class BotModule {}
