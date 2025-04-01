const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys"); const qrcode = require("qrcode-terminal"); const fs = require("fs"); const path = require("path");

const dataDir = path.join(__dirname, "data"); if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const productsFile = path.join(dataDir, "products.json"); if (!fs.existsSync(productsFile)) fs.writeFileSync(productsFile, JSON.stringify([]));

function getProducts() { return JSON.parse(fs.readFileSync(productsFile)); }

function addProduct(name, price) { const products = getProducts(); products.push({ name, price }); fs.writeFileSync(productsFile, JSON.stringify(products)); }

async function startBot() { const { state, saveCreds } = await useMultiFileAuthState(path.join(dataDir, "auth")); const sock = makeWASocket({ auth: state, printQRInTerminal: false });

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", (update) => {
    if (update.qr) {
        qrcode.generate(update.qr, { small: true });
    }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (text) {
        if (text.toLowerCase() === "!المتجر") {
            const products = getProducts();
            let response = "📦 قائمة المنتجات:\n";
            products.forEach((p, i) => {
                response += `${i + 1}. ${p.name} - ${p.price}$\n`;
            });
            if (products.length === 0) response = "📭 لا توجد منتجات حالياً.";
            await sock.sendMessage(sender, { text: response });
        } else if (text.toLowerCase().startsWith("!اضافة")) {
            const parts = text.split(" ");
            if (parts.length < 3) {
                await sock.sendMessage(sender, { text: "❌ استخدم الأمر: !اضافة [اسم المنتج] [السعر]" });
                return;
            }
            const name = parts.slice(1, -1).join(" ");
            const price = parseFloat(parts[parts.length - 1]);
            if (isNaN(price)) {
                await sock.sendMessage(sender, { text: "❌ السعر يجب أن يكون رقمًا صحيحًا!" });
                return;
            }
            addProduct(name, price);
            await sock.sendMessage(sender, { text: `✅ تم إضافة المنتج: ${name} بسعر ${price}$` });
        } else {
            await sock.sendMessage(sender, { text: "أهلاً! استخدم الأوامر: \n!المتجر - لعرض المنتجات\n!اضافة [اسم المنتج] [السعر] - لإضافة منتج جديد (للمدير)" });
        }
    }
});

}

startBot().catch(err => console.error("حدث خطأ أثناء تشغيل البوت", err));

