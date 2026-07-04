import type { ExportOptions, ExportResult, Project } from "@svg-animator/types";
import { exportSmil } from "./smil";
import { exportStateMachinePlayer } from "../state-machine";

const PLAYER_JS = `
(function(){
  var data=JSON.parse(document.currentScript.getAttribute('data-anim'));
  var svg=document.getElementById(data.svgId);
  if(!svg)return;
  var trigger=data.trigger||'load';
  var loop=data.loop||'once';
  function start(){
    var anims=svg.querySelectorAll('animate,animateTransform,animateMotion,set');
    anims.forEach(function(a){try{a.beginElement();}catch(e){}});
  }
  if(trigger==='load'){start();}
  else if(trigger==='hover'){svg.addEventListener('mouseenter',start);}
  else if(trigger==='click'){svg.addEventListener('click',start);}
  else if(trigger==='scroll'){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){if(e.isIntersecting)start();});
    },{threshold:0.3});
    obs.observe(svg);
  }
})();
`.trim();

export function exportJs(project: Project, options: ExportOptions): ExportResult {
  const smil = exportSmil(project, options);
  const svgId = `${options.idPrefix ?? project.settings.idPrefix}_root`;
  let content = smil.content as string;

  content = content.replace("<svg ", `<svg id="${svgId}" `);

  const animData = JSON.stringify({
    svgId,
    trigger: options.trigger ?? project.settings.trigger,
    loop: options.loop ?? project.settings.loop,
    duration: project.duration,
  });

  const script = `<script data-anim='${animData.replace(/'/g, "&#39;")}'>${PLAYER_JS}</script>`;
  content = content.replace("</svg>", `${script}\n</svg>`);

  if (project.stateMachine) {
    const smScript = `<script>${exportStateMachinePlayer(project)}</script>`;
    content = content.replace("</svg>", `${smScript}\n</svg>`);
  }

  return {
    format: "js",
    filename: `${project.name.replace(/[^a-z0-9]/gi, "_")}_js.svg`,
    mimeType: "image/svg+xml",
    content,
    warnings: smil.warnings,
  };
}
