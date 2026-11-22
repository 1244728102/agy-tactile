// Codex 手感 · 注入样式
// 目标观感：按下有轻微回弹、过渡跟手、开关带一点弹性，不用 ease-in-out 那种一卡一卡的过渡。
export function buildCss(opt = {}) {
  const press = Number(opt.press ?? 0.985);
  const dur = Number(opt.duration ?? 150);
  const ease = 'cubic-bezier(.32,.72,0,1)';
  const knobEase = 'cubic-bezier(.2,.8,.2,1)';
  return `html.agy-tactile{
  --tac-dur:${dur}ms;
  --tac-ease:${ease};
  --tac-press:${press};
}

/* 通用控件：颜色跟手 + 按下回弹 */
html.agy-tactile :is(button,[role="button"],[role="menuitem"],[role="tab"],[role="option"]){
  transition:
    background-color var(--tac-dur) var(--tac-ease),
    color var(--tac-dur) var(--tac-ease),
    border-color var(--tac-dur) var(--tac-ease),
    box-shadow var(--tac-dur) var(--tac-ease),
    transform 90ms var(--tac-ease) !important;
}
html.agy-tactile :is(button,[role="button"],[role="menuitem"],[role="tab"],[role="option"]):active{
  transform: scale(var(--tac-press));
}

/* 设置侧栏：行高放宽一点，hover 有填充，按下更深一档 */
html.agy-tactile [data-testid^="settings-nav-item"]{
  padding-top: .42rem !important;
  padding-bottom: .42rem !important;
  border-radius: 10px !important;
  transition:
    background-color var(--tac-dur) var(--tac-ease),
    color var(--tac-dur) var(--tac-ease),
    box-shadow var(--tac-dur) var(--tac-ease),
    transform 90ms var(--tac-ease) !important;
}
html.agy-tactile [data-testid^="settings-nav-item"]:hover{
  background-color: rgba(255,255,255,.075) !important;
}
html.agy-tactile [data-testid^="settings-nav-item"]:active{
  transform: scale(var(--tac-press));
  background-color: rgba(255,255,255,.11) !important;
}
html.agy-tactile [data-testid^="settings-nav-item"]:focus-visible{
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(120,150,255,.45) !important;
}

/* 开关：轨道颜色快一点，滑块带一点弹性 */
html.agy-tactile [role="switch"]{
  transition:
    background-color 180ms var(--tac-ease),
    box-shadow var(--tac-dur) var(--tac-ease),
    transform 90ms var(--tac-ease) !important;
}
html.agy-tactile [role="switch"]:active{
  transform: scale(.96) !important;
}
html.agy-tactile [role="switch"] span{
  transition:
    transform 220ms ${knobEase},
    background-color 180ms var(--tac-ease) !important;
}

/* 列表行：hover 只提一档，按下压回去 */
html.agy-tactile :is([role="listitem"],[data-testid$="-row"],[data-testid*="conversation"]){
  transition: background-color var(--tac-dur) var(--tac-ease), transform 90ms var(--tac-ease) !important;
}

@media (prefers-reduced-motion: reduce){
  html.agy-tactile *{transition-duration: 1ms !important;}
  html.agy-tactile :is(button,[role="button"],[role="switch"],[role="tab"]):active{transform: none !important;}
}`;
}

// 页内安装器：幂等，重载后会被再次调用
export function installSource(css) {
  return `(() => {
  const ID = 'agy-tactile-style';
  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement('style');
    el.id = ID;
    (document.head || document.documentElement).appendChild(el);
  }
  el.textContent = ${JSON.stringify(css)};
  document.documentElement.classList.add('agy-tactile');
  return true;
})()`;
}

export function removeSource() {
  return `(() => {
  document.documentElement.classList.remove('agy-tactile');
  const el = document.getElementById('agy-tactile-style');
  if (el) el.remove();
  return true;
})()`;
}
