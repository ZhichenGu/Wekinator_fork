import type {Point} from './core';

export type HandSide='left'|'right';
export type CoordinateHandOptions={handMode?:'single'|'dual';hand?:'any'|HandSide};
export type HandDetection={landmarks:Point[][];handedness:{categoryName:string;score:number}[][]};
export const coordinateHandSide=(points:Point[])=>((points[0] as (Point&{handSide?:HandSide})|undefined)?.handSide);
const missing=()=>({x:NaN,y:NaN,z:NaN});
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

// A brief dropout is a pause, not permission for the other hand to take over.
export class CoordinateHandChoice {
  private active:HandSide|undefined;
  private missingSince:number|undefined;
  private last=-Infinity;
  reset(){this.active=undefined;this.missingSince=undefined;this.last=-Infinity;}
  follow(side:HandSide,now:number){this.active=side;this.missingSince=undefined;this.last=now;}
  choose(available:HandSide[],now:number):HandSide|undefined {
    if(!Number.isFinite(now)){this.reset();return;}
    if(now<this.last)this.reset();this.last=now;
    if(this.active&&available.includes(this.active)){this.missingSince=undefined;return this.active;}
    if(!this.active){this.active=available[0];this.missingSince=undefined;return this.active;}
    this.missingSince??=now;
    if(available.length&&now-this.missingSince>=300){this.active=available[0];this.missingSince=undefined;return this.active;}
    return undefined;
  }
}

// Keep anatomical identity independent of detection-array order and preview mirroring.
export class CoordinateHands {
  ambiguous=false;
  private previous:Partial<Record<HandSide,Point>>={};
  private choice=new CoordinateHandChoice();
  private settling=0;
  private candidate:Partial<Record<HandSide,Point>>={};
  private time=-Infinity;
  private emptySince:number|undefined;
  private loneCandidate:{side:HandSide;wrist:Point;since:number}|undefined;

  private clearCandidate(){this.settling=0;this.candidate={};}

  step(result:HandDetection,selection:'any'|HandSide='any',dual=false,now=performance.now()):Point[] {
    this.ambiguous=false;
    const paused=()=>{this.choice.choose([],now);return dual?Array.from({length:42},missing):[];};
    if(!Number.isFinite(now)){this.loneCandidate=undefined;return paused();}
    if(now<this.time||now-this.time>350){this.clearCandidate();this.loneCandidate=undefined;}
    if(now<this.time){this.previous={};this.emptySince=undefined;this.choice.reset();}
    this.time=now;
    if(result.landmarks.length===0){
      this.loneCandidate=undefined;
      this.emptySince??=now;
      if(now-this.emptySince>1000){this.previous={};}
    }else this.emptySince=undefined;
    const hands:Partial<Record<HandSide,Point[]>>={};
    const duplicates=new Set<HandSide>();
    let uncertain=false;
    for(let i=0;i<result.landmarks.length;i++){
      const label=result.handedness[i]?.[0];
      const wrist=result.landmarks[i]?.[0];
      if(!label||!Number.isFinite(label.score)||label.score<.8||!wrist||!Number.isFinite(wrist.x)||!Number.isFinite(wrist.y)){
        uncertain=true;continue;
      }
      const side=label.categoryName.toLowerCase() as HandSide;
      if(side!=='left'&&side!=='right'){uncertain=true;continue;}
      if(hands[side])duplicates.add(side);
      hands[side]=result.landmarks[i];
    }
    for(const side of duplicates){delete hands[side];uncertain=true;}
    const left=hands.left?.[0],right=hands.right?.[0];
    if(left&&right&&distance(left,right)<.055){this.ambiguous=true;this.clearCandidate();this.loneCandidate=undefined;return paused();}
    if(uncertain){this.ambiguous=true;this.clearCandidate();this.loneCandidate=undefined;}

    const previousLeft=this.previous.left,previousRight=this.previous.right;
    const swapped=left&&right&&previousLeft&&previousRight&&
      distance(left,previousRight)+distance(right,previousLeft)+.12<distance(left,previousLeft)+distance(right,previousRight);
    if(swapped){
      this.ambiguous=true;
      this.loneCandidate=undefined;
      const stable=this.candidate.left&&this.candidate.right&&
        distance(left,this.candidate.left)<.06&&distance(right,this.candidate.right)<.06;
      this.settling=stable?this.settling+1:1;
      this.candidate={left,right};
      if(this.settling<4)return paused();
    }else{
      this.clearCandidate();
      // Named left/right channels preserve identity through occlusion. Automatic
      // single-hand output can reacquire a lone hand after a sustained valid run;
      // old wrist positions must not block a deliberate handover indefinitely.
      let recovering=false;
      for(const side of ['left','right'] as const){
        const other=side==='left'?'right':'left';
        const wrist=hands[side]?.[0],own=this.previous[side],opposite=this.previous[other];
        if(wrist&&!hands[other]&&own&&opposite&&distance(wrist,opposite)+.12<distance(wrist,own)){
          if(!dual&&selection==='any'&&!uncertain){
            const candidate=this.loneCandidate;
            const continuous=candidate?.side===side&&distance(wrist,candidate.wrist)<.06;
            this.loneCandidate={side,wrist,since:continuous?candidate.since:now};recovering=true;
            if(now-this.loneCandidate.since>=300)continue;
          }
          this.ambiguous=true;delete hands[side];
        }
      }
      if(!recovering)this.loneCandidate=undefined;
    }
    this.clearCandidate();
    for(const side of ['left','right'] as const){
      const wrist=hands[side]?.[0];
      if(wrist)this.previous[side]=wrist;
    }
    if(dual)return [...(hands.left??Array.from({length:21},missing)),...(hands.right??Array.from({length:21},missing))];
    const side=selection==='any'?this.choice.choose((['left','right'] as const).filter(side=>!!hands[side]),now):selection;
    if(selection!=='any'&&hands[selection])this.choice.follow(selection,now);
    return side&&hands[side]?hands[side]!.map((point,id)=>id===0?{...point,handSide:side}:point):[];
  }
}
