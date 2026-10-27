// Only bundled by ios:smoke. Never imported by the production mobile entry.
if (location.search) {
 await import("./main");
} else {
 document.body.style.cssText="font:20px system-ui;padding:60px 24px;background:#111;color:white";
 const title=document.createElement("h1");title.textContent="Synthetic iOS smoke";document.body.append(title);
 for (const scenario of ["ask", "ask-single", "text", "new"]) {
  const link=document.createElement("a");
  link.textContent=`Fixture ${scenario}`;
  link.href=`?case=${scenario==="ask-single"?"ask":scenario}&remote=true${scenario==="new"?"":"&submission"}${scenario==="ask-single"?"&single=true":""}`;
  link.style.cssText="display:block;padding:20px;color:white";
  document.body.append(link);
 }
}

export {};
