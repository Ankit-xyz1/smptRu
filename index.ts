import crypto from "crypto";
import nodemailer from "nodemailer";
import fs from "fs";

// ===============================
// CONFIGURATION
// ===============================
const DOMAIN = "ankit.club";               // your domain
const SELECTOR = "yoursvc1";               // your DKIM selector
const SERVER_IP = "52.66.122.27";          //  random ip
const DB_FILE = "./db.json";

// ===============================
// STEP 1: Generate DKIM keys
// ===============================
function generateDKIM() {
  console.log("🔐 Generating DKIM keys...");

  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  const pub = publicKey.export({ type: "spki", format: "pem" }).toString();
  const priv = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

  // Clean for DNS
  const formattedPublicKey = pub
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\n/g, "");

  const dkimRecord = `v=DKIM1; k=rsa; p=${formattedPublicKey}`;
  const spfRecord = `v=spf1 ip4:${SERVER_IP} -all`;

  const data = {
    domain: DOMAIN,
    selector: SELECTOR,
    publicKey: pub,
    privateKey: priv,
    dkimRecord,
    spfRecord,
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

  console.log("\n🚀 DNS RECORDS TO ADD:");
  console.log("\n👉 DKIM RECORD:");
  console.log(`${SELECTOR}._domainkey.${DOMAIN}  TXT  "${dkimRecord}"\n`);

  console.log("👉 SPF RECORD:");
  console.log(`${DOMAIN} TXT "${spfRecord}"\n`);

  console.log("✔ Saved to db.json");
}

// ===============================
// STEP 2: SEND DKIM SIGNED EMAIL VIA EC2 SERVER
// ===============================
async function sendTestEmail() {
  if (!fs.existsSync(DB_FILE)) {
    console.error("❌ Run generate first: npx ts-node test-mail.ts generate");
    return;
  }

  const auth = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  console.log("📨 Sending email via your EC2 server...");

  const transporter = nodemailer.createTransport({
    host: SERVER_IP,     // your EC2 SMTP server
    port: 587,           // make sure EC2 allows this
    secure: false,
    tls: { rejectUnauthorized: false },
    dkim: {
      domainName: DOMAIN,
      keySelector: SELECTOR,
      privateKey: auth.privateKey,
    },
  });

  const result = await transporter.sendMail({
    from: `Tester <tester@${DOMAIN}>`,
    to: "shahankit023@gmail.com",   // CHANGE THIS
    subject: "🔥 Full DKIM + SPF Test Email",
    html: "<h2>This is a real DKIM signed email from AWS EC2!</h2>",
  });

  console.log("✔ Email sent. Check Gmail → Show original.");
  console.log(result);
}

// ===============================
// CLI Handler
// ===============================
const command = process.argv[2];
if (command === "generate") generateDKIM();
else if (command === "test") sendTestEmail();
else console.log("Usage: npx ts-node test-mail.ts generate | test");

