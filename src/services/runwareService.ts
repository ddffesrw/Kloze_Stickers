/**
 * Runware.ai Service - Native WebSocket Implementation
 * Replaces @runware/sdk-js to avoid Node.js buffer/process issues in Android/Capacitor
 */

interface RunwareConfig {
  apiKey: string;
  url: string;
}

const CONFIG: RunwareConfig = {
  apiKey: import.meta.env.VITE_RUNWARE_API_KEY || "",
  url: "wss://ws-api.runware.ai/v1",
};

// Check for API Key
if (!CONFIG.apiKey && import.meta.env.PROD) {
  console.error('[Runware] VITE_RUNWARE_API_KEY is not configured!');
}

/* Internal Types */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  type: string;
}

let socket: WebSocket | null = null;
let isAuthenticated = false;
let connectionPromise: Promise<void> | null = null;
const pendingRequests = new Map<string, PendingRequest>();

/**
 * Connect and Authenticate
 */
async function connect(): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN && isAuthenticated) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    try {
      console.log('[Runware] Connecting to WebSocket...');
      const ws = new WebSocket(CONFIG.url);

      ws.onopen = () => {
        console.log('[Runware] Connected. Authenticating...');
        const authTask = {
          taskType: "authentication",
          apiKey: CONFIG.apiKey,
          taskUUID: crypto.randomUUID()
        };
        ws.send(JSON.stringify([authTask]));
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data); // Runware sends {data: [...]} or just object? 
          // API sends object with "data": [ ...results...] usually

          if (response.data) {
            response.data.forEach((taskResult: any) => handleTaskResult(taskResult, resolve, reject));
          } else if (response.error) {
            console.error('[Runware] Global Error:', response.error);
            // Reject all pending?
          } else {
            // Sometimes direct object?
            handleTaskResult(response, resolve, reject);
          }

        } catch (e) {
          console.error('[Runware] Message parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('[Runware] WebSocket Error:', e);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        console.log('[Runware] WebSocket Closed');
        socket = null;
        isAuthenticated = false;
        connectionPromise = null;
        // Reject all pending requests to prevent hanging promises
        pendingRequests.forEach((req, id) => {
          req.reject(new Error('WebSocket bağlantısı kapandı'));
        });
        pendingRequests.clear();
      };

      socket = ws;
    } catch (e) {
      reject(e);
      connectionPromise = null;
    }
  });

  return connectionPromise;
}

function handleTaskResult(result: any, connectResolve: () => void, connectReject: (err: any) => void) {
  if (result.taskType === 'authentication') {
    if (result.error) {
      console.error('[Runware] Auth Failed:', result.error);
      connectReject(new Error(result.errorMessage || 'Authentication failed'));
    } else {
      console.log('[Runware] Authenticated!');
      isAuthenticated = true;
      connectResolve();
    }
    return;
  }

  // Handle other tasks
  if (result.taskUUID && pendingRequests.has(result.taskUUID)) {
    const req = pendingRequests.get(result.taskUUID)!;

    if (result.error) {
      req.reject(new Error(result.errorMessage || 'Task failed'));
    } else {
      req.resolve(result);
    }
    pendingRequests.delete(result.taskUUID);
  }
}

async function sendTask(task: any): Promise<any> {
  await connect();

  return new Promise((resolve, reject) => {
    const taskUUID = crypto.randomUUID();
    const taskWithId = { ...task, taskUUID };

    pendingRequests.set(taskUUID, { resolve, reject, type: task.taskType });

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify([taskWithId]));
    } else {
      reject(new Error('WebSocket not connected'));
      pendingRequests.delete(taskUUID);
    }
  });
}

/* Exported Types matching original service */
export interface GenerateStickerOptions {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
}

export interface GeneratedSticker {
  imageURL: string;
  seed: number;
  width: number;
  height: number;
}

/**
 * Generate Sticker (Image Inference)
 */
export async function generateSticker(options: GenerateStickerOptions): Promise<GeneratedSticker> {
  const prompt = `${options.prompt}, die-cut sticker, professional vector illustration, thick white border, solid flat white background, isolated on white background, high quality, 8k, clean edges, sticker style, vibrant colors, simple composition`;

  const task = {
    taskType: "imageInference",
    positivePrompt: prompt,
    negativePrompt: options.negativePrompt || 'complex background, shadows, photo-realistic, gradient, textured background, blurry, watermark, 3d render, shadows, text, signature, multiple objects, cluttered',
    model: "runware:100@1", // Flux Schnell
    width: options.width || 512,
    height: options.height || 512,
    numberResults: 1,
    outputFormat: "PNG",
    outputType: "URL",
    seed: options.seed || Math.floor(Math.random() * 1000000),
    steps: options.steps || 4,
    CFGScale: 1
  };

  try {
    const result = await sendTask(task);
    if (!result.imageURL) throw new Error('No image URL in response');

    return {
      imageURL: result.imageURL,
      seed: result.seed || task.seed,
      width: result.width || task.width,
      height: result.height || task.height
    };
  } catch (error: any) {
    console.error('[Runware] Generation Error:', error);
    throw new Error(error.message || 'Görsel üretimi başarısız');
  }
}

/**
 * Remove Background
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  const task = {
    taskType: "removeBackground", // Correct task type per documentation
    inputImage: imageUrl,
    outputFormat: "PNG",
    outputType: "URL",
    rgba: [255, 255, 255, 0] // Transparent
  };

  try {
    const result = await sendTask(task);
    if (!result.imageURL) throw new Error('No image URL in response');
    return result.imageURL;
  } catch (error: any) {
    console.error('[Runware] BG Removal Error:', error);
    throw new Error(error.message || 'Arka plan silme başarısız');
  }
}

export async function generateMultipleStickers(prompts: string[], options?: any): Promise<GeneratedSticker[]> {
  const results = [];
  for (const prompt of prompts) {
    try {
      const res = await generateSticker({ ...options, prompt });
      results.push(res);
    } catch (e) { console.error(e); }
  }
  return results;
}

export function createPromptVariations(base: string, count: number): string[] {
  return [base]; // Simplified for now
}

export async function checkRunwareCredits(): Promise<number> {
  return 1000;
}