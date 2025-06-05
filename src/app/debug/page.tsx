export default function DebugPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'red', fontSize: '24px' }}>🔧 デバッグページ</h1>
      <p style={{ fontSize: '16px', marginBottom: '10px' }}>このページが表示されていれば、Next.jsは正常に動作しています。</p>
      
      <div style={{ backgroundColor: '#f0f0f0', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>基本情報</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '5px' }}>✅ Next.js App Router: 動作中</li>
          <li style={{ marginBottom: '5px' }}>✅ TypeScript: 動作中</li>
          <li style={{ marginBottom: '5px' }}>✅ React: 動作中</li>
        </ul>
      </div>

      <div style={{ backgroundColor: '#e8f5e8', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>ナビゲーションテスト</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            ホーム
          </a>
          <a href="/test" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            テストページ
          </a>
          <a href="/login" style={{ padding: '8px 16px', backgroundColor: '#ffc107', color: 'black', textDecoration: 'none', borderRadius: '4px' }}>
            ログイン
          </a>
          <a href="/map" style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            地図
          </a>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>環境情報</h2>
        <p><strong>NODE_ENV:</strong> {process.env.NODE_ENV}</p>
        <p><strong>現在時刻:</strong> {new Date().toLocaleString('ja-JP')}</p>
      </div>

      <div style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        <p>このページは純粋なHTMLとインラインCSSで作成されています。</p>
        <p>Tailwind CSSやその他のスタイリングライブラリに依存していません。</p>
      </div>
    </div>
  )
} 