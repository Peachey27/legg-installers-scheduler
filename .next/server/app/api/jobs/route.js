"use strict";(()=>{var e={};e.id=204,e.ids=[204],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7553:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>L,patchFetch:()=>E,requestAsyncStorage:()=>m,routeModule:()=>p,serverHooks:()=>b,staticGenerationAsyncStorage:()=>_});var s={};r.r(s),r.d(s,{GET:()=>c,POST:()=>T,runtime:()=>u});var a=r(9303),n=r(8716),o=r(670),l=r(7070),i=r(3075),d=r(3887);let u="nodejs";async function c(e){try{let e=await i.db.select().from(d.jobs);return l.NextResponse.json(e,{status:200})}catch(e){return console.error("GET /api/jobs failed",e),l.NextResponse.json({error:String(e)},{status:500})}}async function T(e){try{let t=await e.json(),r=new Date().toISOString().slice(0,10),s={id:randomUUID(),clientName:t.clientName??"",clientAddress:t.clientAddress??"",clientPhone:t.clientPhone??"",billingAddress:t.billingAddress??t.clientAddress??"",jobAddress:t.jobAddress??"",dateTaken:t.dateTaken??r,totalPrice:t.totalPrice??null,description:t.description??"",invoiceNumber:t.invoiceNumber??null,estimateNumber:t.estimateNumber??null,cashSaleNumber:t.cashSaleNumber??null,measurements:t.measurements??null,glassOrProductDetails:t.glassOrProductDetails??null,quotedRange:t.quotedRange??null,internalNotes:t.internalNotes??null,assignedDate:t.assignedDate??null,estimatedDurationHours:t.estimatedDurationHours??null,crew:t.crew??null,areaTag:t.areaTag??"Other",status:t.status??"backlog",factoryJobId:t.factoryJobId??null,photo1Url:t.photo1Url??null,photo2Url:t.photo2Url??null,photo3Url:t.photo3Url??null,deletedAt:null},a=["clientName","clientAddress","jobAddress","description"].filter(e=>!s[e]);if(a.length)return l.NextResponse.json({error:`Missing required fields: ${a.join(", ")}`},{status:400});return await i.db.insert(d.jobs).values(s),l.NextResponse.json(s,{status:201})}catch(e){return console.error("Create job failed",e),l.NextResponse.json({error:String(e)},{status:500})}}let p=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/jobs/route",pathname:"/api/jobs",filename:"route",bundlePath:"app/api/jobs/route"},resolvedPagePath:"C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\api\\jobs\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:m,staticGenerationAsyncStorage:_,serverHooks:b}=p,L="/api/jobs/route";function E(){return(0,o.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:_})}},3075:(e,t,r)=>{r.d(t,{db:()=>d});var s=r(5096);let a=require("better-sqlite3");var n=r.n(a),o=r(3887);let l=process.env.DATABASE_FILENAME??(process.env.VERCEL?"/tmp/installer_scheduler.db":"installer_scheduler.db"),i=new(n())(l);!function(e){e.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get()||e.exec(`
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
  `)}(i);let d=(0,s.t)(i,{schema:o})},3887:(e,t,r)=>{r.r(t),r.d(t,{daySettings:()=>l,jobs:()=>o});var s=r(3813),a=r(3586),n=r(4341);let o=(0,s.Px)("jobs",{id:(0,a.fL)("id").primaryKey().notNull(),clientName:(0,a.fL)("client_name").notNull(),clientAddress:(0,a.fL)("client_address").notNull(),clientPhone:(0,a.fL)("client_phone").notNull(),billingAddress:(0,a.fL)("billing_address"),jobAddress:(0,a.fL)("job_address").notNull(),dateTaken:(0,a.fL)("date_taken").notNull(),totalPrice:(0,n.kw)("total_price"),description:(0,a.fL)("description").notNull(),invoiceNumber:(0,a.fL)("invoice_number"),estimateNumber:(0,a.fL)("estimate_number"),cashSaleNumber:(0,a.fL)("cash_sale_number"),measurements:(0,a.fL)("measurements"),glassOrProductDetails:(0,a.fL)("glass_or_product_details"),quotedRange:(0,a.fL)("quoted_range"),internalNotes:(0,a.fL)("internal_notes"),assignedDate:(0,a.fL)("assigned_date"),estimatedDurationHours:(0,n.kw)("estimated_duration_hours"),crew:(0,a.fL)("crew"),areaTag:(0,a.fL)("area_tag").notNull().default("Other"),status:(0,a.fL)("status").notNull().default("backlog"),factoryJobId:(0,a.fL)("factory_job_id"),photo1Url:(0,a.fL)("photo1_url"),photo2Url:(0,a.fL)("photo2_url"),photo3Url:(0,a.fL)("photo3_url"),deletedAt:(0,a.fL)("deleted_at")}),l=(0,s.Px)("day_settings",{date:(0,a.fL)("date").primaryKey(),areaLabel:(0,a.fL)("area_label")})}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[276,671,972],()=>r(7553));module.exports=s})();