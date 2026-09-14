import Combine
import Foundation
import UserNotifications
import WatchConnectivity
import WatchKit

/// The subset of phone settings the watch draws and schedules from.
struct WatchSettings: Codable, Equatable {
  var shape: String = "circle"
  var rewardMode: String = "original"
  var rippleShape: String = "wavy"
  var idleColor: String = "#2C66FF"
  var tapColors: [String] = ["#2C66FF", "#5FC4FF", "#8B5CF6", "#EC4899"]
  var rippleColors: [String] = ["#E6A9FF", "#8DEDFF", "#BBA4FF"]
  var rippleFollowButton: Bool = false
  var backdrop: String = "navy"
  var remindersEnabled: Bool = false
  var reminderEveryHours: Int = 2
  var reminderStartHour: Int = 9
  var reminderEndHour: Int = 21
  var hapticStrength: Double = 0.8

  static let storageKey = "touchward.watch.settings"

  static func load() -> WatchSettings {
    guard let data = UserDefaults.standard.data(forKey: storageKey),
          let decoded = try? JSONDecoder().decode(WatchSettings.self, from: data) else {
      return WatchSettings()
    }
    return decoded
  }

  func save() {
    if let data = try? JSONEncoder().encode(self) {
      UserDefaults.standard.set(data, forKey: Self.storageKey)
    }
  }

  /// Build from the application context the phone sends (a flat JSON object).
  static func from(context: [String: Any]) -> WatchSettings {
    var s = WatchSettings()
    s.shape = context["shape"] as? String ?? s.shape
    s.rewardMode = context["rewardMode"] as? String ?? s.rewardMode
    s.rippleShape = context["rippleShape"] as? String ?? s.rippleShape
    s.idleColor = context["idleColor"] as? String ?? s.idleColor
    s.tapColors = context["tapColors"] as? [String] ?? s.tapColors
    s.rippleColors = context["rippleColors"] as? [String] ?? s.rippleColors
    s.rippleFollowButton = context["rippleFollowButton"] as? Bool ?? s.rippleFollowButton
    s.backdrop = context["backdrop"] as? String ?? s.backdrop
    s.remindersEnabled = context["remindersEnabled"] as? Bool ?? s.remindersEnabled
    s.reminderEveryHours = context["reminderEveryHours"] as? Int ?? s.reminderEveryHours
    s.reminderStartHour = context["reminderStartHour"] as? Int ?? s.reminderStartHour
    s.reminderEndHour = context["reminderEndHour"] as? Int ?? s.reminderEndHour
    s.hapticStrength = context["hapticStrength"] as? Double ?? s.hapticStrength
    return s
  }
}

/// Settings, the local counter, the phone link, and reminder scheduling.
final class WatchModel: NSObject, ObservableObject, WCSessionDelegate {
  static let shared = WatchModel()

  @Published var settings = WatchSettings.load()
  @Published var rewardsToday: Int = UserDefaults.standard.integer(forKey: "touchward.watch.today")
  @Published var pendingTap = false

  private var dayKey: String {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: Date())
  }

  func start() {
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
    rollDayIfNeeded()
    scheduleReminders()
  }

  /// One reward: bump the counter, tell the phone, and refresh the day.
  func recordReward() {
    rollDayIfNeeded()
    rewardsToday += 1
    UserDefaults.standard.set(rewardsToday, forKey: "touchward.watch.today")
    UserDefaults.standard.set(dayKey, forKey: "touchward.watch.day")
    if WCSession.isSupported(), WCSession.default.activationState == .activated {
      WCSession.default.transferUserInfo(["reward": 1])
    }
  }

  private func rollDayIfNeeded() {
    let stored = UserDefaults.standard.string(forKey: "touchward.watch.day")
    if stored != dayKey {
      rewardsToday = 0
      UserDefaults.standard.set(0, forKey: "touchward.watch.today")
      UserDefaults.standard.set(dayKey, forKey: "touchward.watch.day")
    }
  }

  // MARK: Reminders, mirrored from the phone's schedule.

  func scheduleReminders() {
    let center = UNUserNotificationCenter.current()
    center.removeAllPendingNotificationRequests()
    guard settings.remindersEnabled else { return }
    center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
      guard granted else { return }
      let step = max(1, self.settings.reminderEveryHours)
      let start = min(23, max(0, self.settings.reminderStartHour))
      let end = min(23, max(0, self.settings.reminderEndHour))
      guard end >= start else { return }
      let lines = [
        ("Did the thing?", "Come tap. You earned it."),
        ("Touchward check", "One tap. Little buzz. Keep going."),
        ("Small win?", "Log it with a tap."),
        ("Hey.", "Anything done since last time? Tap it."),
        ("Reward yourself", "Tap the button."),
      ]
      var index = 0
      for hour in stride(from: start, through: end, by: step) {
        let content = UNMutableNotificationContent()
        let line = lines[index % lines.count]
        content.title = line.0
        content.body = line.1
        content.userInfo = ["reward": true]
        var components = DateComponents()
        components.hour = hour
        components.minute = 0
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(identifier: "reminder:\(index)", content: content, trigger: trigger)
        center.add(request)
        index += 1
      }
    }
  }

  // MARK: WCSessionDelegate

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let context = session.receivedApplicationContext
    if !context.isEmpty {
      apply(context: context)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    apply(context: applicationContext)
  }

  private func apply(context: [String: Any]) {
    let next = WatchSettings.from(context: context)
    DispatchQueue.main.async {
      let remindersChanged = next.remindersEnabled != self.settings.remindersEnabled
        || next.reminderEveryHours != self.settings.reminderEveryHours
        || next.reminderStartHour != self.settings.reminderStartHour
        || next.reminderEndHour != self.settings.reminderEndHour
      self.settings = next
      next.save()
      if remindersChanged { self.scheduleReminders() }
    }
  }
}
