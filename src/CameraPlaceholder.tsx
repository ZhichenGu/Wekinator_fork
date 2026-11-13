import {Camera,Video} from 'lucide-react';
import {t} from './i18n';

export function CameraPlaceholder({loading=false,loadingModel=true,hint,onStart}:{loading?:boolean;loadingModel?:boolean;hint?:string;onStart:()=>void}) {
  return <div className="camera-placeholder camera-idle" aria-busy={loading}>
    <div className="camera-symbol"><Video size={34} strokeWidth={1.3}/></div>
    <h3>{t(loading?loadingModel?'正在加载模型':'正在开启摄像头':'摄像头未开启')}</h3>
    {(hint||loading&&loadingModel)&&<p>{t(loading&&loadingModel?'首次加载可能需要几秒，请稍候。':hint??'')}</p>}
    <button className="primary" disabled={loading} onClick={onStart}><Camera size={17}/>{t(loading?loadingModel?'模型加载中…':'正在开启摄像头':'开启摄像头')}</button>
  </div>;
}
