import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env');

export async function GET() {
  try {
    const envContent = readFileSync(ENV_PATH, 'utf-8');
    const envVars: Record<string, string> = {};

    // Parse .env file
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      }
    });

    return NextResponse.json({ success: true, env: envVars });
  } catch (error) {
    console.error('Error reading .env file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read environment variables' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { env } = body;

    if (!env || typeof env !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid environment variables' },
        { status: 400 }
      );
    }

    // Read existing .env file to preserve comments and formatting
    let existingContent = '';
    try {
      existingContent = readFileSync(ENV_PATH, 'utf-8');
    } catch (error) {
      // File doesn't exist, will create new one
    }

    // Build new .env content
    const lines: string[] = [];
    const processedKeys = new Set<string>();

    // Update existing lines
    if (existingContent) {
      existingContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        
        // Preserve comments and empty lines
        if (!trimmedLine || trimmedLine.startsWith('#')) {
          lines.push(line);
          return;
        }

        // Parse key
        const [key] = trimmedLine.split('=');
        const cleanKey = key?.trim();

        if (cleanKey && env.hasOwnProperty(cleanKey)) {
          // Update with new value
          const value = env[cleanKey];
          lines.push(`${cleanKey}="${value}"`);
          processedKeys.add(cleanKey);
        } else {
          // Keep original line
          lines.push(line);
        }
      });
    }

    // Add new keys that weren't in the original file
    Object.keys(env).forEach(key => {
      if (!processedKeys.has(key)) {
        lines.push(`${key}="${env[key]}"`);
      }
    });

    // Write to .env file
    const newContent = lines.join('\n');
    writeFileSync(ENV_PATH, newContent, 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: 'Environment variables saved. Please restart the application for changes to take effect.' 
    });
  } catch (error) {
    console.error('Error writing .env file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save environment variables' },
      { status: 500 }
    );
  }
}
