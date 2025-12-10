"use strict";(()=>{var e={};e.id=301,e.ids=[301],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2161:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>f,requestAsyncStorage:()=>L,routeModule:()=>c,serverHooks:()=>b,staticGenerationAsyncStorage:()=>E});var r={};a.r(r),a.d(r,{DELETE:()=>_,GET:()=>T,PUT:()=>p});var s=a(9303),o=a(8716),n=a(670),i=a(7070),d=a(3075),l=a(3887),u=a(7745);async function T(e,{params:t}){let[a]=await d.db.select().from(l.jobs).where((0,u.eq)(l.jobs.id,t.id));return!a||a.deletedAt?i.NextResponse.json({error:"Not found"},{status:404}):i.NextResponse.json(a)}async function p(e,{params:t}){let a=await e.json();return await d.db.update(l.jobs).set(a).where((0,u.eq)(l.jobs.id,t.id)),i.NextResponse.json({ok:!0})}async function _(e,{params:t}){return await d.db.update(l.jobs).set({deletedAt:new Date().toISOString()}).where((0,u.eq)(l.jobs.id,t.id)),i.NextResponse.json({ok:!0})}let c=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/jobs/[id]/route",pathname:"/api/jobs/[id]",filename:"route",bundlePath:"app/api/jobs/[id]/route"},resolvedPagePath:"C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\api\\jobs\\[id]\\route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:L,staticGenerationAsyncStorage:E,serverHooks:b}=c,m="/api/jobs/[id]/route";function f(){return(0,n.patchFetch)({serverHooks:b,staticGenerationAsyncStorage:E})}},3075:(e,t,a)=>{a.d(t,{db:()=>l});var r=a(5096);let s=require("better-sqlite3");var o=a.n(s),n=a(3887);let i=process.env.DATABASE_FILENAME??(process.env.VERCEL?"/tmp/installer_scheduler.db":"installer_scheduler.db"),d=new(o())(i);!function(e){e.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get()||e.exec(`
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
  `)}(d);let l=(0,r.t)(d,{schema:n})},3887:(e,t,a)=>{a.r(t),a.d(t,{daySettings:()=>i,jobs:()=>n});var r=a(3813),s=a(3586),o=a(4341);let n=(0,r.Px)("jobs",{id:(0,s.fL)("id").primaryKey().notNull(),clientName:(0,s.fL)("client_name").notNull(),clientAddress:(0,s.fL)("client_address").notNull(),clientPhone:(0,s.fL)("client_phone").notNull(),billingAddress:(0,s.fL)("billing_address"),jobAddress:(0,s.fL)("job_address").notNull(),dateTaken:(0,s.fL)("date_taken").notNull(),totalPrice:(0,o.kw)("total_price"),description:(0,s.fL)("description").notNull(),invoiceNumber:(0,s.fL)("invoice_number"),estimateNumber:(0,s.fL)("estimate_number"),cashSaleNumber:(0,s.fL)("cash_sale_number"),measurements:(0,s.fL)("measurements"),glassOrProductDetails:(0,s.fL)("glass_or_product_details"),quotedRange:(0,s.fL)("quoted_range"),internalNotes:(0,s.fL)("internal_notes"),assignedDate:(0,s.fL)("assigned_date"),estimatedDurationHours:(0,o.kw)("estimated_duration_hours"),crew:(0,s.fL)("crew"),areaTag:(0,s.fL)("area_tag").notNull().default("Other"),status:(0,s.fL)("status").notNull().default("backlog"),factoryJobId:(0,s.fL)("factory_job_id"),photo1Url:(0,s.fL)("photo1_url"),photo2Url:(0,s.fL)("photo2_url"),photo3Url:(0,s.fL)("photo3_url"),deletedAt:(0,s.fL)("deleted_at")}),i=(0,r.Px)("day_settings",{date:(0,s.fL)("date").primaryKey(),areaLabel:(0,s.fL)("area_label")})}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[276,671,972],()=>a(2161));module.exports=r})();