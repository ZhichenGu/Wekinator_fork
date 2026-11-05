export class RequestBudget{
 used=0;limit=30;
 reset(limit:number){if(!Number.isInteger(limit)||limit<1||limit>1000)throw new Error('本轮请求上限需为 1–1000 的整数。');this.used=0;this.limit=limit;}
 consume(){if(this.used>=this.limit)return false;this.used++;return true;}
 get exhausted(){return this.used>=this.limit;}
}
