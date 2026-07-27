export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-busy="true">
      <span className="brand-mark large" aria-hidden="true"><span /></span>
      <strong>正在开启词库</strong>
      <p>学习记录保存在当前浏览器的 IndexedDB</p>
    </main>
  )
}

