import before from './before.json';
import after from './after.json';
export type Scenario={id:string;status:string;durationMs:number;failures:{field:string;message:string}[];coverage?:{model:{total:number;consumed:number;pending:string[]};tools:{total:number;consumed:number};httpGuard:boolean;osSandbox:boolean};events?:any[];process?:{stdout?:string;stderr?:string;exitCode?:number}};
export type Report={version:number;lane:string;revision:string|null;createdAt:string;ok:boolean;scenarios:Scenario[]};
export type Project={id:string;name:string;repository:string;baselineId?:string|null;createdAt:string};
export type Run={id:string;projectId:string;label:string;createdAt:string;report:Report};
export type Workspace={projects:Project[];runs:Run[]};
export const example:Workspace={projects:[{id:'scout',name:'Scout',repository:'https://github.com/8dazo/scout',baselineId:'scout-fixed',createdAt:'2026-09-28T00:00:00Z'}],runs:[{id:'scout-fixed',projectId:'scout',label:'Narration validation · fixed',createdAt:after.createdAt,report:after as Report},{id:'scout-original',projectId:'scout',label:'Narration validation · original',createdAt:before.createdAt,report:before as Report}]};
export const nav=[['','Overview'],['projects','Projects'],['runs','Runs'],['scenarios','Scenarios'],['fixtures','Fixture coverage'],['connections','Connections'],['settings','Settings']];
