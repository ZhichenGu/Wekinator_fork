import { FilesetResolver, HandLandmarker, FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { extract, type Mode, type Point } from './core';

let detector: HandLandmarker | FaceLandmarker | PoseLandmarker | null = null;
let mode: Mode = 'hand';
self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  if (data.type === 'init') {
    try {
      mode = data.mode;
      const files = await FilesetResolver.forVisionTasks(data.base + 'wasm');
      const baseOptions = {modelAssetPath: data.base + 'models/' + mode + '.task', delegate: 'CPU' as const};
      detector?.close();
      if (mode === 'hand') detector = await HandLandmarker.createFromOptions(files,{baseOptions,runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6});
      if (mode === 'face') detector = await FaceLandmarker.createFromOptions(files,{baseOptions,runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true});
      if (mode === 'pose') detector = await PoseLandmarker.createFromOptions(files,{baseOptions,runningMode:'VIDEO',numPoses:1});
      self.postMessage({type:'ready'});
    } catch (e) {self.postMessage({type:'error',message:e instanceof Error ? e.message : String(e)});}
  }
  if (data.type === 'frame') {
    const image = data.image as ImageBitmap;
    try {
      if (!detector) throw new Error('检测模型尚未加载');
      const begin = performance.now();
      let points: Point[] = [], blend: number[] = [];
      if (mode === 'hand') points = (detector as HandLandmarker).detectForVideo(image,data.t).landmarks[0] ?? [];
      if (mode === 'pose') points = (detector as PoseLandmarker).detectForVideo(image,data.t).landmarks[0] ?? [];
      if (mode === 'face') {
        const result = (detector as FaceLandmarker).detectForVideo(image,data.t);
        points = result.faceLandmarks[0] ?? [];
        blend = result.faceBlendshapes[0]?.categories.map(c=>c.score) ?? [];
      }
      self.postMessage({type:'result',frame:extract(mode,points,blend,data.t),points,ms:performance.now()-begin});
    } catch (e) {self.postMessage({type:'error',message:e instanceof Error ? e.message : String(e)});}
    finally {image.close();}
  }
};
