import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import {
  Context as TelegrafContext,
  Markup,
  Telegraf,
  Context,
} from "telegraf";
import { Bot } from "./models/bot.model";
import { BOT_NAME } from "../app.constants";
import { Ctx, InjectBot, On } from "nestjs-telegraf";

@Injectable()
export class BotService {
  constructor(
    @InjectModel(Bot) private readonly botModel: typeof Bot,
    @InjectBot(BOT_NAME) private readonly bot: Telegraf<TelegrafContext>
  ) {}

  async start(ctx: TelegrafContext) {
    const userId = ctx.from?.id;
    if (!userId) return;

    let user = await this.botModel.findOne({ where: { userId } });

    if (!user) {
      user = await this.botModel.create({
        userId,
        username: ctx.from?.username,
        first_name: ctx.from?.first_name,
        last_name: ctx.from?.last_name,
        lang: ctx.from?.language_code,
      });
    }

    if (!user.status) {
      await ctx.reply("Iltimos,📞 Telefon raqamni yuborish tugmasini bosing", {
        parse_mode: "HTML",
        ...Markup.keyboard([
          [Markup.button.contactRequest("📞 Telefon raqamni yuborish")],
        ])
          .resize()
          .oneTime(),
      });
    } else {
      await this.bot.telegram.sendChatAction(userId, "typing");
      await this.onRoleSelection(ctx);
    }
  }

  async onContact(ctx: TelegrafContext) {
    if (!ctx.message || !("contact" in ctx.message)) return;

    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await this.botModel.findOne({ where: { userId } });
    if (!user) {
      await ctx.reply("Iltimos, avval /start tugmasini bosing", {
        parse_mode: "HTML",
        ...Markup.keyboard([["/start"]])
          .resize()
          .oneTime(),
      });
      return;
    }

    if (ctx.message.contact.user_id !== userId) {
      await ctx.reply("Iltimos, o'zingizning raqamingizni yuboring", {
        parse_mode: "HTML",
        ...Markup.keyboard([
          [Markup.button.contactRequest("📞 Telefon raqamni yuborish")],
        ])
          .resize()
          .oneTime(),
      });
      return;
    }

    let phone = ctx.message.contact.phone_number;
    if (phone[0] !== "+") {
      phone = "+" + phone;
    }

    user.phone_number = phone;
    user.status = true;
    await user.save();

    await ctx.reply("Siz <b>Saxiy</b>misiz yoki <b>Sabrli</b>", {
      parse_mode: "HTML",
      ...Markup.keyboard([["Saxiy", "Sabrli"]])
        .resize()
        .oneTime(),
    });
  }

  async onStop(ctx: TelegrafContext) {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await this.botModel.findOne({ where: { userId } });
      if (user && user.status) {
        await this.botModel.destroy({ where: { userId } });
        await ctx.reply("Saxiy boylardan bo'ling", {
          parse_mode: "HTML",
          ...Markup.removeKeyboard(),
        });
      }
    } catch (error) {
      console.error("onStop error:", error);
    }
  }

  async onRoleSelection(ctx: TelegrafContext) {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await this.botModel.findOne({ where: { userId } });
    if (!user) {
      await ctx.reply("Iltimos, avval /start ni bosing.");
      return;
    }

    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, tugmalardan birini tanlang.");
      return;
    }

    const role = ctx.message.text.trim();
    if (role === "Saxiy" || role === "Sabrli") {
      user.role = role;
      await user.save();
      await ctx.reply(`Siz <b>${role}</b> sifatida ro'yxatdan o'tdingiz! ✅`, {
        parse_mode: "HTML",
        ...Markup.removeKeyboard(),
      });
      if (role == "Saxiy") {
        await this.askMasterDetails(ctx);
      } else if (role === "Sabrli") {
        await this.askSabrliDetails(ctx);
      }
    } else {
      await ctx.reply("Iltimos, quyidagi variantlardan birini tanlang:", {
        parse_mode: "HTML",
        ...Markup.keyboard([["Saxiy", "Sabrli"]])
          .resize()
          .oneTime(),
      });
    }
  }

  userSteps = new Map<number, any>();
  userData = new Map<number, any>();

  async askSabrliDetails(ctx: Context) {
    const userId = ctx.from!.id;
    this.userSteps.set(userId, 0);
    this.userData.set(userId, {});

    await ctx.reply("Ismingizni kiriting:");
  }
  async handleSabrliResponse(ctx: Context) {
    const userId = ctx.from!.id;
    let step = this.userSteps.get(userId) ?? 0;
    let userData = this.userData.get(userId) ?? {};

    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, faqat matn kiriting.");
      return;
    }

    const userInput = ctx.message.text.trim();

    switch (step) {
      case 0:
        userData.name = userInput;
        await ctx.reply("Jinsingizni tanlang:", {
          ...Markup.keyboard([["Erkak", "Ayol"]])
            .resize()
            .oneTime(),
        });
        step++;
        break;
      case 1:
        userData.gender = userInput;
        await ctx.reply("Yoshingizni kiriting:");
        step++;
        break;
      case 2:
        userData.age = userInput;
        await ctx.reply("Telefon raqamingizni kiriting:");
        step++;
        break;
      case 3:
        userData.phone = userInput;
        await ctx.reply("Viloyatingizni tanlang:", {
          parse_mode: "HTML",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("Toshkent shahri", "toshkent_shahri"),
              Markup.button.callback("Toshkent viloyati", "toshkent_viloyati"),
            ],
            [
              Markup.button.callback("Farg'ona viloyati", "fargona"),
              Markup.button.callback("Andijon viloyati", "andijon"),
            ],
            [
              Markup.button.callback("Namangan viloyati", "namangan"),
              Markup.button.callback("Jizzax viloyati", "jizzax"),
            ],
            [
              Markup.button.callback("Sirdaryo viloyati", "sirdaryo"),
              Markup.button.callback("Samarqand viloyati", "samarqand"),
            ],
            [
              Markup.button.callback("Surxandaryo viloyati", "surxandaryo"),
              Markup.button.callback("Qashqadaryo viloyati", "qashqadaryo"),
            ],
            [
              Markup.button.callback("Buxoro viloyati", "buxoro"),
              Markup.button.callback("Navoiy viloyati", "navoiy"),
            ],
            [
              Markup.button.callback("Xorazm viloyati", "xorazm"),
              Markup.button.callback(
                "Qoraqalpog'iston Respublikasi",
                "qoraqalpogiston"
              ),
            ],
          ]),
        });
        step++;
        break;
      case 4:
        userData.region = userInput;
        await ctx.reply("Tumaningizni kiriting:");
        step++;
        break;
      case 5:
        userData.district = userInput;
        await ctx.reply("Qanday yordam kerakligini yozib qoldiring:");
        step++;
        break;
      case 6:
        userData.help = userInput;

        await ctx.reply(
          `✅ Ma'lumotlaringiz:\n\n` +
            `👤 Ism: ${userData.name}\n` +
            `🧑 Jinsi: ${userData.gender}\n` +
            `📅 Yoshi: ${userData.age}\n` +
            `📞 Telefon: ${userData.phone}\n` +
            `📍 Viloyat: ${userData.region}\n` +
            `🏢 Tuman: ${userData.district}\n` +
            `🆘 Yordam: ${userData.help}\n\n` +
            `Tasdiqlash uchun ✅ Tasdiqlash tugmasini bosing yoki bekor qilish uchun ❌ Bekor qilish tugmasini bosing.`,
          {
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback("✅ Tasdiqlash", "confirm_sabrli"),
                Markup.button.callback("❌ Bekor qilish", "cancel_sabrli"),
              ],
            ]),
          }
        );

        step++;
        break;
    }

    this.userSteps.set(userId, step);
    this.userData.set(userId, userData);
  }

  public getUserStep(userId: number): number {
    return this.userSteps.get(userId) ?? 0;
  }
  @On("callback_query")
  async onCallbackQuery(@Ctx() ctx: Context) {
    try {
      const user_id = ctx.from?.id;
      if (!user_id) return;

      let userState = this.userSteps.get(user_id);
      if (!userState) {
        userState = { userData: {}, step: 0 };
        this.userSteps.set(user_id, userState);
      }

      if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
        await ctx.answerCbQuery("Xatolik yuz berdi.");
        return;
      }

      const callbackData = ctx.callbackQuery.data as string;

      const districts = {
        toshkent_shahri: [
          "Yunusobod",
          "Chilonzor",
          "Olmazor",
          "Yakkasaroy",
          "Sergili",
          "Yashnabod",
          "Uchtepa",
          "Bektemir",
        ],
        toshkent_viloyati: [
          "Chirchiq",
          "Bekobod",
          "Bekobod tumani",
          "Angren",
          "Yangiyo'l",
          "Olmaliq",
          "Zangiota",
        ],
        fargona: [
          "Farg'ona",
          "Qo'qon",
          "Marg'ilon",
          "Oltiariq",
          "Chimyon",
          "Buvayda",
          "Dang'ara",
          "Farg'ona tumani",
        ],
        andijon: [
          "Andijon",
          "Asaka",
          "Xonobod",
          "Baliqchi",
          "Bo'z",
          "Buloqboshi",
          "Izboskan",
          "Marhamat",
          "Oltinko'l",
        ],
        namangan: [
          "Namangan",
          "Chortoq",
          "Pop",
          "Chust",
          "Kosonsoy",
          "Mingbuloq",
          "Norin",
          "To'raqo'rg'on",
        ],
        jizzax: ["Jizzax", "G'allaorol", "Zomin", "Paxtakor", "Dashtobod"],
        sirdaryo: [
          "Guliston",
          "Shirin",
          "Yangiyer",
          "Xovos",
          "Sardoba",
          "Baxt",
        ],
        samarqand: ["Samarqand", "Kattaqo'rg'on", "Urgut", "Qo'shrabot"],
        surxandaryo: ["Termiz", "Sherobod", "Denov"],
        qashqadaryo: ["Qarshi", "Kitob", "Shahrisabz"],
        buxoro: ["Buxoro", "G'ijduvon", "Kogon"],
        navoiy: ["Navoiy", "Zarafshon", "Uchquduq"],
        xorazm: ["Urganch", "Xiva", "Pitnak"],
        qoraqalpogiston: ["Nukus", "Mo'ynoq", "Taxiatosh"],
      };

      if (callbackData.startsWith("viloyat_")) {
        const viloyatKey = callbackData.replace("viloyat_", "");

        if (districts[viloyatKey]) {
          userState.userData.region = viloyatKey; 
          userState.step = 4; 

          await ctx.reply("Tumaningizni tanlang:", {
            parse_mode: "HTML",
            ...Markup.inlineKeyboard(
              districts[viloyatKey].map((district) => [
                Markup.button.callback(
                  district,
                  `district_${district.toLowerCase()}`
                ),
              ])
            ),
          });

          await ctx.answerCbQuery();
          return;
        }
      }

      if (callbackData.startsWith("district_")) {
        const tumanName = callbackData
          .replace("district_", "")
          .replace("_", " ");
        userState.userData.district = tumanName;
        userState.step = 5

        await ctx.reply(`✅ Siz **${tumanName}** tumanini tanladingiz.`);
        await ctx.reply("Qanday yordam kerakligini yozib qoldiring:");

        await ctx.answerCbQuery();
        return;
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error("onCallbackQuery xatosi:", error);
    }
  }

  async askMasterDetails(ctx: Context) {
    const userId = ctx.from!.id;
    this.userSteps.set(userId, 0);
    this.userData.set(userId, {});

    await ctx.reply("Ismingizni kiriting:");
  }

  async handleMasterResponse(ctx: Context) {
    const userId = ctx.from!.id;
    let step = this.userSteps.get(userId) ?? 0;
    let userData = this.userData.get(userId) ?? {};

    console.log("Current step:", step);
    console.log("Received message:", ctx.message);

    if (!ctx.message) {
      await ctx.reply("Iltimos, ma'lumot yuboring.");
      return;
    }

    if (step === 2 && "location" in ctx.message && ctx.message.location) {
      userData.location = ctx.message.location;
      step++;

      this.userSteps.set(userId, step);
      this.userData.set(userId, userData);

      await ctx.reply(
        `✅ Ma'lumotlaringiz:\n\n` +
          `👤 Ism: ${userData.name}\n` +
          `📞 Telefon: ${userData.phone}\n` +
          `📍 Lokatsiya: Kiritildi\n\n` +
          `Tasdiqlash uchun ✅ Tasdiqlash tugmasini bosing yoki bekor qilish uchun ❌ Bekor qilish tugmasini bosing.`,
        {
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback("✅ Tasdiqlash", "confirm_data"),
              Markup.button.callback("❌ Bekor qilish", "cancel_data"),
            ],
          ]),
        }
      );

      return;
    }

    if (!("text" in ctx.message)) {
      await ctx.reply("Iltimos, faqat matn kiriting.");
      return;
    }

    const userInput = ctx.message.text.trim();

    switch (step) {
      case 0:
        userData.name = userInput;
        await ctx.reply("📞 Telefon raqamingizni kiriting:");
        step++;
        break;
      case 1:
        userData.phone = userInput;
        await ctx.reply("📍 Lokatsiyangizni yuboring:", {
          ...Markup.keyboard([
            [Markup.button.locationRequest("📍 Lokatsiyani yuborish")],
          ])
            .resize()
            .oneTime(),
        });
        step++;
        break;
      case 2:
        await ctx.reply("❗ Iltimos, lokatsiyangizni yuboring 📍.");
        return;
    }
    this.userSteps.set(userId, step);
    this.userData.set(userId, userData);
  }

  async findUserById(userId: number) {
    return await this.botModel.findByPk(userId);
  }

  async confirmRegistration(ctx: Context) {
    const userId = ctx.from!.id;

    this.userSteps.delete(userId);
    this.userData.delete(userId);

    await ctx.reply("✅ Siz ro'yxatdan muvaffaqiyatli o'tdingiz!", {
      ...Markup.keyboard([
        ["Muruvvat qilish", "Sabrlilarni ko'rish"],
        ["Admin bilan bog'lanish", "Sozlamalar"],
      ]).resize(),
    });
  }
}
