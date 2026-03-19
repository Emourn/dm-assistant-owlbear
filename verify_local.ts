
import { fetchSpell, fetchFeat } from './src/engine/fiveEToolsParser';

async function verifyLocalization() {
    console.log("--- Verifying Spell Localization ---");
    const guidance = await fetchSpell("Guidance");
    if (guidance) {
        console.log(`Spell: ${guidance.name}`);
        console.log(`Source: ${guidance.source}`);
        console.log(`Is 2024: ${guidance.is2024}`);
        if (guidance.is2024 && guidance.source === "PHB 2024") {
            console.log("✅ Success: Guidance localized to 2024.");
        } else {
            console.log("❌ Failure: Guidance not localized correctly.");
        }
    } else {
        console.log("❌ Failure: Guidance not found.");
    }

    console.log("\n--- Verifying Feat Localization ---");
    const alert = await fetchFeat("Alert");
    if (alert) {
        console.log(`Feat: ${alert.name}`);
        console.log(`Source: ${alert.source}`);
        console.log(`Is 2024: ${alert.is2024}`);
        if (alert.is2024 && alert.source === "PHB 2024") {
            console.log("✅ Success: Alert localized to 2024.");
        } else {
            console.log("❌ Failure: Alert not localized correctly.");
        }
    } else {
        console.log("❌ Failure: Alert not found.");
    }
}

verifyLocalization().catch(console.error);
