import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST() {
  try {
    console.log("🚀 Launching structure analysis...");
    
    // On appelle le script NPM défini dans package.json
    const { stdout, stderr } = await execPromise('npm run audit');

    if (stderr) console.warn("⚠️ Analysis warnings:", stderr);
    console.log("✅ Analysis complete:", stdout);

    return NextResponse.json({ 
      success: true, 
      message: "Structure analysis complete",
      output: stdout 
    });

  } catch (error) {
    console.error("❌ Script execution failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run analysis script" },
      { status: 500 }
    );
  }
}