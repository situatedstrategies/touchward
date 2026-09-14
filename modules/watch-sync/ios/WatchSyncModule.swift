import ExpoModulesCore
import WatchConnectivity

/**
 Bridges the phone and the Apple Watch app over WatchConnectivity.

 `updateContext` pushes the current settings (as JSON) as the session's
 application context, which the watch receives even when it is not running.
 Rewards recorded on the watch arrive as user info transfers and are emitted
 to JavaScript as `onWatchReward` events so the phone's counter stays in step.
 */
public class WatchSyncModule: Module {
  private var delegate: SessionDelegate?

  public func definition() -> ModuleDefinition {
    Name("WatchSync")

    Events("onWatchReward")

    OnCreate {
      guard WCSession.isSupported() else { return }
      let delegate = SessionDelegate { [weak self] count in
        self?.sendEvent("onWatchReward", ["count": count])
      }
      self.delegate = delegate
      WCSession.default.delegate = delegate
      WCSession.default.activate()
    }

    Function("isSupported") { () -> Bool in
      WCSession.isSupported()
    }

    Function("isPaired") { () -> Bool in
      guard WCSession.isSupported() else { return false }
      return WCSession.default.isPaired && WCSession.default.isWatchAppInstalled
    }

    AsyncFunction("updateContext") { (json: String) in
      guard WCSession.isSupported() else { return }
      guard let data = json.data(using: .utf8),
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw Exception(name: "InvalidContext", description: "Settings must be a JSON object.")
      }
      let session = WCSession.default
      if session.activationState != .activated {
        session.activate()
      }
      try session.updateApplicationContext(object)
    }
  }
}

private final class SessionDelegate: NSObject, WCSessionDelegate {
  private let onReward: (Int) -> Void

  init(onReward: @escaping (Int) -> Void) {
    self.onReward = onReward
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    if let count = userInfo["reward"] as? Int {
      DispatchQueue.main.async { self.onReward(count) }
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    if let count = message["reward"] as? Int {
      DispatchQueue.main.async { self.onReward(count) }
    }
  }
}
