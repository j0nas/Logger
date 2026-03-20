// Native module to bridge UserDefaults writes from React Native to the App Group container.
// This file is included via a config plugin that adds it to the Xcode project.

import Foundation
import React

@objc(SharedDefaults)
class SharedDefaults: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { return false }

  @objc func set(_ groupId: String, key: String, value: String) {
    guard let defaults = UserDefaults(suiteName: groupId) else { return }
    defaults.set(value, forKey: key)
    // Trigger widget timeline refresh
    if #available(iOS 14.0, *) {
      WidgetKit.WidgetCenter.shared.reloadAllTimelines()
    }
  }

  @objc func get(_ groupId: String, key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: groupId) else {
      resolve(nil)
      return
    }
    resolve(defaults.string(forKey: key))
  }

  @objc func getPendingLogs(_ groupId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: groupId) else {
      resolve([])
      return
    }
    let pending = defaults.array(forKey: "pendingLogs") as? [[String: Any]] ?? []
    // Clear pending after reading
    defaults.removeObject(forKey: "pendingLogs")
    resolve(pending)
  }
}
