import SwiftUI

/// The same outlines as the phone app, sampled in a unit box centered on 0.5,
/// starting at 12 o'clock and running clockwise.
enum Outline {
  static let steps = 144

  static func points(for shape: String) -> [CGPoint] {
    switch shape {
    case "squircle": return superellipse(0.47, 4)
    case "square": return superellipse(0.46, 10)
    case "hexagon": return polygon(6, 0.47)
    case "star": return star(5, 0.48, 0.24)
    case "heart": return heart()
    case "blob": return polar { a in 0.42 + 0.04 * sin(3 * a + 0.6) + 0.03 * sin(5 * a + 2.1) }
    case "ripples": return wavy
    default: return superellipse(0.47, 2)
    }
  }

  /// The icon's wavy ring.
  static let wavy: [CGPoint] = polar { a in 0.45 + 0.03 * sin(8 * a + 0.4) }

  static func path(_ pts: [CGPoint], in rect: CGRect) -> Path {
    var p = Path()
    guard let first = pts.first else { return p }
    func map(_ pt: CGPoint) -> CGPoint {
      CGPoint(x: rect.minX + pt.x * rect.width, y: rect.minY + pt.y * rect.height)
    }
    p.move(to: map(first))
    for pt in pts.dropFirst() { p.addLine(to: map(pt)) }
    p.closeSubpath()
    return p
  }

  private static func polar(_ radius: (Double) -> Double) -> [CGPoint] {
    (0..<steps).map { i in
      let a = -Double.pi / 2 + Double(i) / Double(steps) * Double.pi * 2
      let r = radius(a)
      return CGPoint(x: 0.5 + r * cos(a), y: 0.5 + r * sin(a))
    }
  }

  private static func superellipse(_ a: Double, _ n: Double) -> [CGPoint] {
    polar { angle in
      let c = abs(cos(angle)), s = abs(sin(angle))
      return a / pow(pow(c, n) + pow(s, n), 1 / n)
    }
  }

  private static func polygon(_ sides: Int, _ radius: Double) -> [CGPoint] {
    (0..<sides).map { i in
      let a = -Double.pi / 2 + Double(i) * 2 * Double.pi / Double(sides)
      return CGPoint(x: 0.5 + radius * cos(a), y: 0.5 + radius * sin(a))
    }
  }

  private static func star(_ points: Int, _ outer: Double, _ inner: Double) -> [CGPoint] {
    (0..<(points * 2)).map { i in
      let r = i % 2 == 0 ? outer : inner
      let a = -Double.pi / 2 + Double(i) * Double.pi / Double(points)
      return CGPoint(x: 0.5 + r * cos(a), y: 0.5 + r * sin(a))
    }
  }

  private static func heart() -> [CGPoint] {
    var raw: [CGPoint] = []
    for i in 0..<steps {
      let t = Double(i) / Double(steps) * Double.pi * 2
      let x = 16 * pow(sin(t), 3)
      let y = -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t))
      raw.append(CGPoint(x: x, y: y))
    }
    let xs = raw.map(\.x), ys = raw.map(\.y)
    let w = xs.max()! - xs.min()!, h = ys.max()! - ys.min()!
    let k = 0.94 / max(w, h)
    let cx = (xs.max()! + xs.min()!) / 2, cy = (ys.max()! + ys.min()!) / 2
    let pts = raw.map { CGPoint(x: 0.5 + ($0.x - cx) * k, y: 0.5 + ($0.y - cy) * k) }
    return [pts[0]] + pts.dropFirst().reversed()
  }
}

extension Color {
  /// "#RRGGBB" to Color. Anything else is a mid blue.
  init(hex: String) {
    var h = hex.trimmingCharacters(in: .whitespaces)
    if h.hasPrefix("#") { h.removeFirst() }
    if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
    guard h.count == 6, let n = UInt32(h, radix: 16) else {
      self = Color(red: 0.17, green: 0.4, blue: 1)
      return
    }
    self.init(
      red: Double((n >> 16) & 255) / 255,
      green: Double((n >> 8) & 255) / 255,
      blue: Double(n & 255) / 255
    )
  }

  func lighter(_ amount: Double) -> Color {
    Color(hexMix(self, toward: (1, 1, 1), amount: amount))
  }

  func darker(_ amount: Double) -> Color {
    Color(hexMix(self, toward: (0, 0, 0), amount: amount))
  }
}

private func hexMix(_ c: Color, toward t: (Double, Double, Double), amount: Double) -> Color {
  #if canImport(UIKit)
  let ui = UIColor(c)
  var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
  ui.getRed(&r, green: &g, blue: &b, alpha: &a)
  return Color(
    red: Double(r) + (t.0 - Double(r)) * amount,
    green: Double(g) + (t.1 - Double(g)) * amount,
    blue: Double(b) + (t.2 - Double(b)) * amount
  )
  #else
  return c
  #endif
}
