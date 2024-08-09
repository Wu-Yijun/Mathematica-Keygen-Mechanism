/**
   * This file is not necessary. I write it so that I can use it at any place.
   * This is a easy tool to Show a Notify inside page. No need to init;
   * @param {string} text : The text you want to show in your page.
   * @param {*} dt        : The duration of the text being shown. Default to be
   *     1000 ms.
   * @param {string} color: The color of the text. Default to be green.
   * @returns             : No returning Value
   * Notice that the function will automatically log in console.
   */
function myFloatingNotify(text, dt, color = 'green') {
  const defaultDt = 1000;
  const fadeTime = 1000;
  const myFloatingWindowName = 'myFloatingWindow';

  if (dt)
    dt = dt;
  else
    dt = defaultDt;

  let myFloatingWindow = document.getElementById(myFloatingWindowName);
  if (myFloatingWindow == null) {
    const newDiv = document.createElement('div');
    newDiv.id = myFloatingWindowName;
    newDiv.style.position = 'fixed';
    newDiv.style.bottom = '10px';
    newDiv.style.left = '10px';
    newDiv.style.display = 'flex';
    newDiv.style.flexDirection = 'column';
    newDiv.style.backgroundColor = '#b9b9b933';
    newDiv.style.padding = '8px';
    newDiv.style.transition = 'width 5s linear';
    // f*K ** 页面的最下方的“版权所有”不要脸，z-index 开大。
    // 你不讲武德，我也不讲了...
    newDiv.style.zIndex = 100000;

    document.body.appendChild(newDiv);

    myFloatingWindow = newDiv;
  }

  const newContiner = document.createElement('div');
  newContiner.style.transition = `opacity ${fadeTime}ms ease`;
  newContiner.style.marginTop = `5px`;
  newContiner.style.padding = `3px`;
  newContiner.style.backgroundColor = '#ffffff59';

  const newContent = document.createElement('label');
  newContent.style.width = '200px';
  newContent.style.display = 'grid';
  newContent.append(text);

  const newProgressBar = document.createElement('div');
  newProgressBar.style.height = '3px';
  newProgressBar.style.width = '1px';
  newProgressBar.style.backgroundColor = color;
  newProgressBar.style.transition = `width ${dt}ms ease`;

  newContiner.appendChild(newContent);
  newContiner.appendChild(newProgressBar);

  // progress bar
  setTimeout(() => {newProgressBar.style.width = '200px'}, 100);
  // fade out
  setTimeout(() => {
    newContiner.style.opacity = 0;
  }, dt);
  // disapper
  setTimeout(() => {
    newContiner.style.display = 'none';
  }, dt + fadeTime);
  myFloatingWindow.appendChild(newContiner);
  return;
};
// 保存原始的 console.warn 方法
const originalConsoleWarn = console.warn;
// 重写 console.warn 方法
console.warn = function(...args) {
  // 调用原始的 console.warn 方法，以便信息仍然显示在控制台中
  originalConsoleWarn.apply(console, args);
  // 将信息显示在页面上
  args.forEach((arg) => {
    myFloatingNotify(arg, 5000, 'orange');
  });
};
// 保存原始的 console.error 方法
const originalConsoleError = console.error;
// 重写 console.error 方法
console.error = function(...args) {
  // 调用原始的 console.error 方法，以便信息仍然显示在控制台中
  originalConsoleError.apply(console, args);
  // 将信息显示在页面上
  args.forEach((arg) => {
    myFloatingNotify(arg, 8000, 'red');
  });
};
// 保存原始的 console.info 方法
const originalConsoleInfo = console.info;
// 重写 console.info 方法
console.info = function(...args) {
  // 调用原始的 console.info 方法，以便信息仍然显示在控制台中
  originalConsoleInfo.apply(console, args);
  // 将信息显示在页面上
  args.forEach((arg) => {
    myFloatingNotify(arg, 3000, 'blue');
  });
};
// 保存原始的 console.log 方法
const originalConsoleLog = console.log;
// 重写 console.log 方法
console.log = function(...args) {
  // 调用原始的 console.log 方法，以便信息仍然显示在控制台中
  originalConsoleLog.apply(console, args);
  // 将信息显示在页面上
  args.forEach((arg) => {
    myFloatingNotify(arg, 1000, 'green');
  });
};