import SwiftUI
import WatchKit

/// One ripple travelling out from the core.
private struct Ripple: Identifiable {
  let id = UUID()
  let color: Color
  let startedAt: Date
}

/// The watch face of Touchward: the button and its ripples, nothing else.
struct ContentView: View {
  @EnvironmentObject private var model: WatchModel
  @State private var ripples: [Ripple] = []
  @State private var buttonColor: Color = Color(hex: "#2C66FF")
  @State private var colorIndex = -1
  @State private var rippleIndex = -1
  @State private var pressed = false
  @State private var wave: Date? = nil

  private let rippleDuration: TimeInterval = 1.0
  private let waveDuration: TimeInterval = 0.9

  var body: some View {
    GeometryReader { geo in
      let side = min(geo.size.width, geo.size.height)
      let original = model.settings.rewardMode == "original"
      let core = original ? side * 0.34 : side * 0.62
      ZStack {
        backdrop
        TimelineView(.animation(minimumInterval: 1 / 60, paused: ripples.isEmpty && wave == nil)) { timeline in
          let now = timeline.date
          Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            if original {
              drawRings(context: &context, center: center, core: core, now: now)
            }
            drawRipples(context: &context, center: center, core: core, now: now)
          }
        }
        .allowsHitTesting(false)
        coreButton(size: core)
      }
      .frame(width: geo.size.width, height: geo.size.height)
    }
    .ignoresSafeArea()
    .onAppear { buttonColor = Color(hex: model.settings.idleColor) }
    .onChange(of: model.settings.idleColor) { _, hex in buttonColor = Color(hex: hex) }
    .onChange(of: model.pendingTap) { _, pending in
      if pending {
        reward()
        model.pendingTap = false
      }
    }
  }

  private var backdrop: some View {
    Group {
      if model.settings.backdrop == "navy" || model.settings.backdrop == "system" {
        LinearGradient(colors: [Color(hex: "#12307C"), Color(hex: "#040A26")], startPoint: .top, endPoint: .bottom)
      } else {
        Color(hex: model.settings.backdrop)
      }
    }
    .ignoresSafeArea()
  }

  private func coreButton(size: CGFloat) -> some View {
    let pts = Outline.points(for: model.settings.shape)
    return ZStack {
      Outline.path(pts, in: CGRect(x: 0, y: 0, width: size, height: size))
        .fill(buttonColor)
        .shadow(color: buttonColor.opacity(0.7), radius: size * 0.12)
      Outline.path(pts, in: CGRect(x: 0, y: 0, width: size, height: size))
        .fill(RadialGradient(colors: [.clear, .white.opacity(0.5)], center: .center, startRadius: size * 0.2, endRadius: size * 0.5))
      Outline.path(pts, in: CGRect(x: 0, y: 0, width: size, height: size))
        .stroke(Color.white.opacity(0.85), lineWidth: 1.5)
    }
    .frame(width: size, height: size)
    .scaleEffect(pressed ? 0.94 : 1)
    .animation(.spring(response: 0.25, dampingFraction: 0.6), value: pressed)
    .contentShape(Rectangle())
    .gesture(
      DragGesture(minimumDistance: 0)
        .onChanged { _ in if !pressed { pressed = true } }
        .onEnded { _ in
          pressed = false
          reward()
        }
    )
    .accessibilityLabel("Reward button")
    .accessibilityAddTraits(.isButton)
  }

  // MARK: Rewards

  private func reward() {
    let strength = model.settings.hapticStrength
    WKInterfaceDevice.current().play(strength > 0.9 ? .notification : (strength > 0.5 ? .click : .directionUp))
    let colors = model.settings.tapColors.map { Color(hex: $0) }
    if !colors.isEmpty {
      colorIndex = (colorIndex + 1) % colors.count
      withAnimation(.easeOut(duration: 0.22)) { buttonColor = colors[colorIndex] }
    }
    let now = Date()
    if model.settings.rewardMode == "original" { wave = now }
    ripples.append(Ripple(color: nextRippleColor(), startedAt: now))
    model.recordReward()
    DispatchQueue.main.asyncAfter(deadline: .now() + rippleDuration + 0.1) {
      ripples.removeAll { now.timeIntervalSince($0.startedAt) >= rippleDuration }
      if let w = wave, Date().timeIntervalSince(w) >= waveDuration { wave = nil }
    }
  }

  private var palette: [Color] {
    if model.settings.rippleFollowButton { return [] }
    return model.settings.rippleColors.map { Color(hex: $0) }
  }

  private func nextRippleColor() -> Color {
    let p = palette
    guard !p.isEmpty else { return buttonColor }
    rippleIndex = (rippleIndex + 1) % p.count
    return p[rippleIndex]
  }

  // MARK: Drawing

  private func outlinePoints() -> [CGPoint] {
    switch model.settings.rippleShape {
    case "wavy": return Outline.wavy
    case "round": return Outline.points(for: "circle")
    default: return Outline.points(for: model.settings.shape)
    }
  }

  private func ringColors() -> [Color] {
    let p = palette
    if p.isEmpty { return [buttonColor.lighter(0.3), buttonColor, buttonColor.darker(0.2)] }
    return (0..<3).map { p[$0 % p.count] }
  }

  private func drawRings(context: inout GraphicsContext, center: CGPoint, core: CGFloat, now: Date) {
    let r = core / 2
    let radii: [CGFloat] = [1.7, 2.4, 3.2].map { $0 * r }
    let colors = ringColors()
    let band = 0.37 * r
    let progress = wave.map { min(1, now.timeIntervalSince($0) / waveDuration) }
    for (i, radius) in radii.enumerated() {
      var swell: CGFloat = 1
      var boost: Double = 0
      if let p = progress {
        let start = Double(i) * 0.1
        let local = max(0, min(1, (p - start) / 0.5))
        swell = 1 + 0.06 * CGFloat(sin(local * .pi))
        boost = 0.25 * sin(local * .pi)
      }
      let size = radius * 2 * swell / 0.9
      let rect = CGRect(x: center.x - size / 2, y: center.y - size / 2, width: size, height: size)
      let path = Outline.path(outlinePoints(), in: rect)
      let color = colors[i]
      context.stroke(path, with: .color(color.opacity(0.12 + boost * 0.3)), lineWidth: band * 2.6)
      context.stroke(path, with: .color(color.opacity(0.85 + boost * 0.15)), lineWidth: band)
      context.stroke(path, with: .color(color.lighter(0.55).opacity(0.95)), lineWidth: band * 0.5)
      context.stroke(path, with: .color(.white.opacity(0.6)), lineWidth: band * 0.15)
    }
  }

  private func drawRipples(context: inout GraphicsContext, center: CGPoint, core: CGFloat, now: Date) {
    let outline = outlinePoints()
    for ripple in ripples {
      let t = min(1, now.timeIntervalSince(ripple.startedAt) / rippleDuration)
      let eased = 1 - pow(1 - t, 3)
      let scale = 1.04 + eased * (model.settings.rewardMode == "original" ? 2.6 : 1.3)
      let opacity = t < 0.12 ? t / 0.12 : max(0, 1 - (t - 0.12) / 0.88)
      let size = core * scale / 0.9
      let rect = CGRect(x: center.x - size / 2, y: center.y - size / 2, width: size, height: size)
      let path = Outline.path(outline, in: rect)
      let w = core * 0.045
      context.stroke(path, with: .color(ripple.color.opacity(0.22 * opacity)), lineWidth: w * 2.4)
      context.stroke(path, with: .color(ripple.color.opacity(opacity)), lineWidth: w)
      context.stroke(path, with: .color(ripple.color.lighter(0.45).opacity(0.9 * opacity)), lineWidth: w * 0.5)
    }
  }
}
