'use client'

import { useEffect, useRef } from 'react'

export function HolographicOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    // Animation variables
    let rotation = 0
    let time = 0
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
    }[] = []

    // Orb center
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const orbRadius = 100

    const drawOrb = (x: number, y: number, radius: number, opacity: number) => {
      // Outer glow
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5)
      glowGradient.addColorStop(0, `rgba(0, 217, 255, ${opacity * 0.3})`)
      glowGradient.addColorStop(0.5, `rgba(177, 0, 255, ${opacity * 0.1})`)
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glowGradient
      ctx.fillRect(x - radius * 1.5, y - radius * 1.5, radius * 3, radius * 3)

      // Wireframe sphere
      ctx.strokeStyle = `rgba(0, 217, 255, ${opacity * 0.6})`
      ctx.lineWidth = 1

      // Draw latitude lines
      for (let i = -3; i <= 3; i++) {
        const latOffset = (i / 3) * radius
        const latRadius = Math.sqrt(radius * radius - latOffset * latOffset)

        ctx.beginPath()
        for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
          const px = x + Math.cos(angle + rotation) * latRadius
          const py = y + latOffset
          if (angle === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      // Draw longitude lines
      ctx.strokeStyle = `rgba(177, 0, 255, ${opacity * 0.4})`
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + rotation
        ctx.beginPath()
        for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += 0.05) {
          const px = x + Math.cos(angle) * radius * Math.cos(lat)
          const py = y + Math.sin(lat) * radius
          if (lat === -Math.PI / 2) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Inner glow core
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      coreGradient.addColorStop(0, `rgba(255, 0, 255, ${opacity * 0.4})`)
      coreGradient.addColorStop(0.5, `rgba(0, 217, 255, ${opacity * 0.1})`)
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = coreGradient
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawParticles = (x: number, y: number, radius: number) => {
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.life -= 1
        p.vy += 0.1 // gravity

        const opacity = (p.life / p.maxLife) * 0.6
        ctx.fillStyle = `rgba(0, 217, 255, ${opacity})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      })

      // Remove dead particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) {
          particles.splice(i, 1)
        }
      }

      // Emit new particles
      if (time % 3 === 0) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 2
        particles.push({
          x: x + Math.cos(angle) * radius,
          y: y + Math.sin(angle) * radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 60,
          maxLife: 60,
        })
      }
    }

    const animate = () => {
      // Clear with fade effect
      ctx.fillStyle = 'rgba(10, 10, 15, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const opacity = 0.7
      drawOrb(centerX, centerY, orbRadius, opacity)
      drawParticles(centerX, centerY, orbRadius)

      rotation += 0.003
      time++

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  )
}
