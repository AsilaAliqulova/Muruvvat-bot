import {
  InjectBot,
  Start,
  Update,
  Command,
  Hears,
  Ctx,
  On,
} from "nestjs-telegraf";
import { Context, Telegraf } from "telegraf";
import { BOT_NAME } from "../app.constants";
import { BotService } from "./bot.service";

@Update()
export class BotUpdate {
  constructor(
    private readonly botService: BotService,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<Context>
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    await this.botService.start(ctx);
  }

  @Command("stop")
  async onStop(@Ctx() ctx: Context) {
    if (!ctx.from) return;
    await this.botService.onStop(ctx);
  }

  @Hears(["Saxiy", "Sabrli"])
  async onRoleSelection(@Ctx() ctx: Context) {
    if (
      !ctx.from ||
      !ctx.message ||
      !("text" in ctx.message) ||
      !ctx.message.text.trim()
    ) {
      await ctx.reply("Iltimos, quyidagi tugmalardan birini tanlang:");
      return;
    }
    await this.botService.onRoleSelection(ctx);
  }

  @On("contact")
  async onContact(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!ctx.from || !ctx.message || !("contact" in ctx.message) || !userId)
      return;

    if (!ctx.message.contact || ctx.message.contact.user_id !== userId) {
      await ctx.reply(
        "Iltimos, faqat o'zingizning telefon raqamingizni yuboring."
      );
      return;
    }
    await this.botService.onContact(ctx);
  }

  @On("callback_query")
  async onCallbackQuery(@Ctx() ctx: Context) {
    const callbackQuery = ctx.callbackQuery;

    if (!callbackQuery || !("data" in callbackQuery)) return;

    const callbackData = callbackQuery.data;

    if (callbackData === "confirm_data") {
      await this.botService.confirmRegistration(ctx);
    } else if (callbackData === "cancel_data") {
      await ctx.reply("❌ Ro'yxatdan o'tish bekor qilindi.");
    }

    await ctx.answerCbQuery();
  }

  @On("text")
  async onText(@Ctx() ctx: Context) {
    if (!ctx.message || !("text" in ctx.message) || !ctx.message.text?.trim()) {
      return;
    }

    const text = ctx.message.text.trim();
    const userId = ctx.from?.id;
    if (!userId) return;

    const userStep = this.botService.getUserStep(userId);

    if (userStep >= 0) {
      const user = await this.botService.findUserById(userId);

      if (user && user.role === "Saxiy") {
        await this.botService.handleMasterResponse(ctx);
      } else if (user && user.role === "Sabrli") {
        await this.botService.handleSabrliResponse(ctx);
      }
    }
  }

  @On("message")
  async onMessage(@Ctx() ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const userStep = this.botService.getUserStep(userId);

    if (userStep >= 0) {
      const user = await this.botService.findUserById(userId);

      if (user && user.role === "Saxiy") {
        await this.botService.handleMasterResponse(ctx);
      } else if (user && user.role === "Sabrli") {
        await this.botService.handleSabrliResponse(ctx);
      }
    }
  }
}
