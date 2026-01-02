import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    console.log("🚀 Lancement d'une nouvelle version (Snapshot)...");
    
    // MODIFICATION ICI : On ajoute " -- save" pour passer l'argument au script via npm
    // "npm run audit" lance le script, le "--" dit à npm "ce qui suit est pour le script"
    const { stdout, stderr } = await execPromise('npm run audit -- save');

    if (stderr) {
        console.warn("⚠️ Warnings analyse:", stderr);
    }

    console.log("✅ Analyse terminée:", stdout);

    return NextResponse.json({ 
      success: true, 
      message: "Snapshot créé avec succès",
      output: stdout 
    });

  } catch (error: any) {
    console.error("❌ Echec du script:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur inconnue" },
      { status: 500 }
    );
  }
}