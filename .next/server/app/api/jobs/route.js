"use strict";(()=>{var e={};e.id=204,e.ids=[204],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4770:e=>{e.exports=require("crypto")},7553:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>E,patchFetch:()=>N,requestAsyncStorage:()=>_,routeModule:()=>m,serverHooks:()=>L,staticGenerationAsyncStorage:()=>b});var a={};r.r(a),r.d(a,{GET:()=>T,POST:()=>p,runtime:()=>c});var s=r(9303),o=r(8716),n=r(670),l=r(7070),i=r(3075),d=r(3887),u=r(4770);let c="nodejs";async function T(e){try{let e=await i.db.select().from(d.jobs);return l.NextResponse.json(e,{status:200})}catch(e){return console.error("GET /api/jobs failed",e),l.NextResponse.json({error:String(e)},{status:500})}}async function p(e){try{let t=await e.json();for(let e of["clientName","clientPhone","clientAddress","jobAddress","description","areaTag","status"])if(!t[e])throw Error(`Missing required field: ${e}`);let r={id:(0,u.randomUUID)(),clientName:t.clientName,clientAddress:t.clientAddress,clientPhone:t.clientPhone,billingAddress:t.billingAddress??t.clientAddress,jobAddress:t.jobAddress,dateTaken:t.dateTaken,totalPrice:t.totalPrice??null,description:t.description,invoiceNumber:t.invoiceNumber??null,estimateNumber:t.estimateNumber??null,cashSaleNumber:t.cashSaleNumber??null,measurements:t.measurements??null,glassOrProductDetails:t.glassOrProductDetails??null,quotedRange:t.quotedRange??null,internalNotes:t.internalNotes??null,assignedDate:t.assignedDate??null,estimatedDurationHours:t.estimatedDurationHours??null,crew:t.crew??null,areaTag:t.areaTag??"Other",status:t.status??"backlog",factoryJobId:t.factoryJobId??null,photo1Url:t.photo1Url??null,photo2Url:t.photo2Url??null,photo3Url:t.photo3Url??null,deletedAt:null};return await i.db.insert(d.jobs).values(r),l.NextResponse.json(r,{status:201})}catch(e){return console.error("Create job failed",e),l.NextResponse.json({error:String(e)},{status:500})}}let m=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/jobs/route",pathname:"/api/jobs",filename:"route",bundlePath:"app/api/jobs/route"},resolvedPagePath:"C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\api\\jobs\\route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:_,staticGenerationAsyncStorage:b,serverHooks:L}=m,E="/api/jobs/route";function N(){return(0,n.patchFetch)({serverHooks:L,staticGenerationAsyncStorage:b})}},3075:(e,t,r)=>{r.d(t,{db:()=>d});var a=r(5096);let s=require("better-sqlite3");var o=r.n(s),n=r(3887);let l=process.env.DATABASE_FILENAME??(process.env.VERCEL?"/tmp/installer_scheduler.db":"installer_scheduler.db"),i=new(o())(l);!function(e){e.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get()||e.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      client_name TEXT NOT NULL,
      client_address TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      billing_address TEXT,
      job_address TEXT NOT NULL,
      date_taken TEXT NOT NULL,
      total_price REAL,
      description TEXT NOT NULL,
      invoice_number TEXT,
      estimate_number TEXT,
      cash_sale_number TEXT,
      measurements TEXT,
      glass_or_product_details TEXT,
      quoted_range TEXT,
      internal_notes TEXT,
      assigned_date TEXT,
      estimated_duration_hours REAL,
      crew TEXT,
      area_tag TEXT NOT NULL DEFAULT 'Other',
      status TEXT NOT NULL DEFAULT 'backlog',
      factory_job_id TEXT,
      photo1_url TEXT,
      photo2_url TEXT,
      photo3_url TEXT,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS day_settings (
      date TEXT PRIMARY KEY,
      area_label TEXT
    );
  `)}(i);let d=(0,a.t)(i,{schema:n})},3887:(e,t,r)=>{r.r(t),r.d(t,{daySettings:()=>l,jobs:()=>n});var a=r(3813),s=r(3586),o=r(4341);let n=(0,a.Px)("jobs",{id:(0,s.fL)("id").primaryKey().notNull(),clientName:(0,s.fL)("client_name").notNull(),clientAddress:(0,s.fL)("client_address").notNull(),clientPhone:(0,s.fL)("client_phone").notNull(),billingAddress:(0,s.fL)("billing_address"),jobAddress:(0,s.fL)("job_address").notNull(),dateTaken:(0,s.fL)("date_taken").notNull(),totalPrice:(0,o.kw)("total_price"),description:(0,s.fL)("description").notNull(),invoiceNumber:(0,s.fL)("invoice_number"),estimateNumber:(0,s.fL)("estimate_number"),cashSaleNumber:(0,s.fL)("cash_sale_number"),measurements:(0,s.fL)("measurements"),glassOrProductDetails:(0,s.fL)("glass_or_product_details"),quotedRange:(0,s.fL)("quoted_range"),internalNotes:(0,s.fL)("internal_notes"),assignedDate:(0,s.fL)("assigned_date"),estimatedDurationHours:(0,o.kw)("estimated_duration_hours"),crew:(0,s.fL)("crew"),areaTag:(0,s.fL)("area_tag").notNull().default("Other"),status:(0,s.fL)("status").notNull().default("backlog"),factoryJobId:(0,s.fL)("factory_job_id"),photo1Url:(0,s.fL)("photo1_url"),photo2Url:(0,s.fL)("photo2_url"),photo3Url:(0,s.fL)("photo3_url"),deletedAt:(0,s.fL)("deleted_at")}),l=(0,a.Px)("day_settings",{date:(0,s.fL)("date").primaryKey(),areaLabel:(0,s.fL)("area_label")})}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[276,671,972],()=>r(7553));module.exports=a})();