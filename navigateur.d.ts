interface Document {
  getElementById(id: string): any;
}

interface ParentNode {
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): NodeListOf<any>;
}

interface HTMLCanvasElement {
  dpr: number;
}

interface Navigator {
  standalone?: boolean;
  audioSession?: { type: string };
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
