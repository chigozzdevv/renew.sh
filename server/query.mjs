import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb+srv://uchigozzdev:SVvS5olJK6oQ06DJ@renew.zhjv0hd.mongodb.net/renew_v1?appName=renew");

await client.connect();
const db = client.db("renew");

const customers = db.collection("customers");
const charges = db.collection("charges");
const subscriptions = db.collection("subscriptions");

const allCustomers = await customers.find({}).project({ customerRef: 1, market: 1, monthlyVolumeUsdc: 1 }).toArray();
console.log("=== CUSTOMERS ===");
allCustomers.forEach(c => console.log(`  ${c.customerRef} | market: ${c.market} | vol: ${c.monthlyVolumeUsdc}`));

const allCharges = await charges.find({}).project({ status: 1, usdcAmount: 1, subscriptionId: 1 }).toArray();
console.log("\n=== CHARGES (status + usdc) ===");
for (const ch of allCharges) {
    const sub = await subscriptions.findOne({ _id: ch.subscriptionId });
    const cust = sub ? await customers.findOne({ customerRef: sub.customerRef }) : null;
    console.log(`  charge ${ch._id} | status: ${ch.status} | usdc: ${ch.usdcAmount} | market: ${cust?.market ?? "?"}`);
}

await client.close();
