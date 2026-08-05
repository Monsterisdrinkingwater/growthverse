import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#faf7f2',
            backgroundImage:
              'radial-gradient(circle at 25% 25%, rgba(196, 101, 74, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(122, 158, 126, 0.08) 0%, transparent 50%)',
          }}
        >
          {/* Logo / Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 120,
              height: 120,
              borderRadius: '50%',
              backgroundColor: 'rgba(196, 101, 74, 0.1)',
              marginBottom: 32,
            }}
          >
            <span style={{ fontSize: 64 }}>🌿</span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#2d2926',
              margin: 0,
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            GrowthVerse
          </h1>

          <p
            style={{
              fontSize: 28,
              color: '#6b6560',
              margin: '8px 0 0 0',
              textAlign: 'center',
            }}
          >
            成长宇宙
          </p>

          {/* Tagline */}
          <p
            style={{
              fontSize: 22,
              color: '#9a9088',
              margin: '24px 0 0 0',
              textAlign: 'center',
              maxWidth: 600,
              lineHeight: 1.5,
            }}
          >
            AI 驱动的沉浸式阅读伴侣
          </p>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 40,
            }}
          >
            {['📚 图书宇宙', '🤖 AI 对话', '🌱 成长追踪'].map((feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 20px',
                  borderRadius: 999,
                  backgroundColor: 'rgba(196, 101, 74, 0.06)',
                  border: '1px solid rgba(196, 101, 74, 0.12)',
                  fontSize: 16,
                  color: '#6b6560',
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to generate OG image'
    return new Response(message, { status: 500 })
  }
}
