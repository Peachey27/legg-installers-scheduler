(()=>{var e={};e.id=437,e.ids=[437],e.modules={2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},9137:(e,s,a)=>{"use strict";a.r(s),a.d(s,{GlobalError:()=>i.a,__next_app__:()=>p,originalPathname:()=>m,pages:()=>c,routeModule:()=>h,tree:()=>o}),a(5852),a(2029),a(5866);var t=a(3191),l=a(8716),r=a(7922),i=a.n(r),n=a(5231),d={};for(let e in n)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(d[e]=()=>n[e]);a.d(s,d);let o=["",{children:["jobs",{children:["[id]",{children:["print",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,5852)),"C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\jobs\\[id]\\print\\page.tsx"]}]},{}]},{}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,2029)),"C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,5866,23)),"next/dist/client/components/not-found-error"]}],c=["C:\\Users\\Michael\\Desktop\\Installer App\\src\\app\\jobs\\[id]\\print\\page.tsx"],m="/jobs/[id]/print/page",p={require:a,loadChunk:()=>Promise.resolve()},h=new t.AppPageRouteModule({definition:{kind:l.x.APP_PAGE,page:"/jobs/[id]/print/page",pathname:"/jobs/[id]/print",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:o}})},1681:(e,s,a)=>{Promise.resolve().then(a.t.bind(a,2994,23)),Promise.resolve().then(a.t.bind(a,6114,23)),Promise.resolve().then(a.t.bind(a,9727,23)),Promise.resolve().then(a.t.bind(a,9671,23)),Promise.resolve().then(a.t.bind(a,1868,23)),Promise.resolve().then(a.t.bind(a,4759,23))},4298:()=>{},5930:(e,s,a)=>{Promise.resolve().then(a.bind(a,9699))},9699:(e,s,a)=>{"use strict";a.d(s,{default:()=>l});var t=a(326);a(7577);let l=function({job:e}){return(0,t.jsxs)("div",{className:"print-wrapper",children:[t.jsx("style",{children:`
        @page { size: 150mm 100mm; margin: 4mm; }
        body {
          margin: 0;
          background: white !important;
          font-family: "Inter", system-ui, sans-serif;
          color: #111;
        }
        .print-wrapper {
          display: flex;
          justify-content: center;
          padding: 0;
        }
        .card {
          width: 150mm;
          height: 100mm;
          border: 1px solid #111;
          padding: 6mm 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 6mm;
        }
        .row {
          display: flex;
          gap: 4mm;
        }
        .label {
          font-size: 11px;
          font-weight: 600;
          margin-right: 2mm;
          white-space: nowrap;
        }
        .value {
          flex: 1;
          border-bottom: 1px solid #000;
          min-height: 12px;
          font-size: 12px;
          line-height: 1.2;
          padding-bottom: 1mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lines {
          display: grid;
          grid-template-rows: repeat(4, 1fr);
          gap: 3mm;
        }
        .line {
          border-bottom: 1px solid #000;
          height: 10mm;
          font-size: 12px;
          padding-bottom: 1mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bottom-row {
          display: flex;
          gap: 4mm;
          align-items: flex-end;
        }
        @media print {
          .no-print {
            display: none;
          }
        }
      `}),(0,t.jsxs)("div",{className:"card",children:[(0,t.jsxs)("div",{className:"row",children:[(0,t.jsxs)("div",{style:{flex:1.2},children:[(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm"},children:[t.jsx("span",{className:"label",children:"Name:"}),t.jsx("span",{className:"value",children:e.clientName})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm",marginTop:"3mm"},children:[t.jsx("span",{className:"label",children:"Address:"}),t.jsx("span",{className:"value",children:e.clientAddress})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm",marginTop:"3mm"},children:[t.jsx("span",{className:"label",children:"Phone:"}),t.jsx("span",{className:"value",children:e.clientPhone})]})]}),(0,t.jsxs)("div",{style:{flex:.8},children:[(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm"},children:[t.jsx("span",{className:"label",children:"Invoice No.:"}),t.jsx("span",{className:"value",children:e.invoiceNumber??""})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm",marginTop:"3mm"},children:[t.jsx("span",{className:"label",children:"Estimate No.:"}),t.jsx("span",{className:"value",children:e.estimateNumber??""})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm",marginTop:"3mm"},children:[t.jsx("span",{className:"label",children:"Cash Sale No.:"}),t.jsx("span",{className:"value",children:e.cashSaleNumber??""})]}),(0,t.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"2mm",marginTop:"3mm"},children:[t.jsx("span",{className:"label",children:"Date:"}),t.jsx("span",{className:"value",children:e.dateTaken})]})]})]}),(0,t.jsxs)("div",{className:"lines",children:[t.jsx("div",{className:"line",children:e.description}),t.jsx("div",{className:"line",children:e.internalNotes??""}),t.jsx("div",{className:"line"}),t.jsx("div",{className:"line"})]}),(0,t.jsxs)("div",{className:"bottom-row",children:[(0,t.jsxs)("div",{style:{flex:1,display:"flex",alignItems:"center",gap:"2mm"},children:[t.jsx("span",{className:"label",children:"Job Address:"}),t.jsx("span",{className:"value",children:e.jobAddress})]}),(0,t.jsxs)("div",{style:{flex:.6,display:"flex",alignItems:"center",gap:"2mm"},children:[t.jsx("span",{className:"label",children:"Total Price: $"}),t.jsx("span",{className:"value",style:{minWidth:"20mm"},children:e.totalPrice??""})]})]})]})]})}},5852:(e,s,a)=>{"use strict";a.r(s),a.d(s,{default:()=>o});var t=a(9510),l=a(6687),r=a(3887),i=a(7745),n=a(8570);(0,n.createProxy)(String.raw`C:\Users\Michael\Desktop\Installer App\src\components\jobs\PrintJobCard.tsx#PrintJobCard`);let d=(0,n.createProxy)(String.raw`C:\Users\Michael\Desktop\Installer App\src\components\jobs\PrintJobCard.tsx#default`);async function o({params:e}){let[s]=await l.db.select().from(r.jobs).where((0,i.eq)(r.jobs.id,e.id));return!s||s.deletedAt?t.jsx("div",{className:"p-4",children:"Not found"}):t.jsx(d,{job:s})}},2029:(e,s,a)=>{"use strict";a.r(s),a.d(s,{default:()=>r,metadata:()=>l});var t=a(9510);a(5023);let l={title:"LEGG Installers Scheduler"};function r({children:e}){return t.jsx("html",{lang:"en",children:t.jsx("body",{className:"min-h-screen bg-[#f3e6d9]",children:t.jsx("div",{className:"min-h-screen bg-[radial-gradient(circle_at_1px_1px,#d9c4a5_1px,transparent_0)] bg-[length:12px_12px]",children:e})})})}},6687:(e,s,a)=>{"use strict";a.d(s,{db:()=>o});var t=a(5096);let l=require("better-sqlite3");var r=a.n(l),i=a(3887);let n=process.env.DATABASE_FILENAME??"installer_scheduler.db",d=new(r())(n);d.exec(`
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
`);let o=(0,t.t)(d,{schema:i})},3887:(e,s,a)=>{"use strict";a.r(s),a.d(s,{daySettings:()=>n,jobs:()=>i});var t=a(3813),l=a(3586),r=a(4341);let i=(0,t.Px)("jobs",{id:(0,l.fL)("id").primaryKey().notNull(),clientName:(0,l.fL)("client_name").notNull(),clientAddress:(0,l.fL)("client_address").notNull(),clientPhone:(0,l.fL)("client_phone").notNull(),billingAddress:(0,l.fL)("billing_address"),jobAddress:(0,l.fL)("job_address").notNull(),dateTaken:(0,l.fL)("date_taken").notNull(),totalPrice:(0,r.kw)("total_price"),description:(0,l.fL)("description").notNull(),invoiceNumber:(0,l.fL)("invoice_number"),estimateNumber:(0,l.fL)("estimate_number"),cashSaleNumber:(0,l.fL)("cash_sale_number"),measurements:(0,l.fL)("measurements"),glassOrProductDetails:(0,l.fL)("glass_or_product_details"),quotedRange:(0,l.fL)("quoted_range"),internalNotes:(0,l.fL)("internal_notes"),assignedDate:(0,l.fL)("assigned_date"),estimatedDurationHours:(0,r.kw)("estimated_duration_hours"),crew:(0,l.fL)("crew"),areaTag:(0,l.fL)("area_tag").notNull().default("Other"),status:(0,l.fL)("status").notNull().default("backlog"),factoryJobId:(0,l.fL)("factory_job_id"),photo1Url:(0,l.fL)("photo1_url"),photo2Url:(0,l.fL)("photo2_url"),photo3Url:(0,l.fL)("photo3_url"),deletedAt:(0,l.fL)("deleted_at")}),n=(0,t.Px)("day_settings",{date:(0,l.fL)("date").primaryKey(),areaLabel:(0,l.fL)("area_label")})},5023:()=>{}};var s=require("../../../../webpack-runtime.js");s.C(e);var a=e=>s(s.s=e),t=s.X(0,[276,471,671],()=>a(9137));module.exports=t})();