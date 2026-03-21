import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Shared Data

private let groupID = "group.com.tali.app"

struct TrackerInfo: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let type: String
}

struct TodayLog: Codable {
    let trackerId: Int
    let trackerName: String
    let trackerIcon: String
    let value: String?
    let loggedAt: String
}

struct WidgetSnapshot: Codable {
    let trackers: [TrackerInfo]
    let todayLogs: [TodayLog]
    let lastSyncedAt: String
}

private func loadSnapshot() -> WidgetSnapshot? {
    guard let defaults = UserDefaults(suiteName: groupID),
          let json = defaults.string(forKey: "widgetData"),
          let data = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

// MARK: - Quick Log Intent (interactive widget button)

struct QuickLogIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Log"
    static var description = IntentDescription("Log a tracker entry from the widget")

    @Parameter(title: "Tracker ID")
    var trackerId: Int

    @Parameter(title: "Tracker Name")
    var trackerName: String

    init() {
        self.trackerId = 0
        self.trackerName = ""
    }

    init(trackerId: Int, trackerName: String) {
        self.trackerId = trackerId
        self.trackerName = trackerName
    }

    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: groupID) else {
            return .result()
        }

        // Write a pending log entry that the RN app will pick up on foreground
        var pending = defaults.array(forKey: "pendingLogs") as? [[String: Any]] ?? []
        pending.append([
            "trackerId": trackerId,
            "trackerName": trackerName,
            "loggedAt": ISO8601DateFormatter().string(from: Date()),
        ])
        defaults.set(pending, forKey: "pendingLogs")

        // Update today's count for immediate UI feedback
        let countKey = "todayCount_\(trackerId)"
        let current = defaults.integer(forKey: countKey)
        defaults.set(current + 1, forKey: countKey)
        defaults.set(Date().timeIntervalSince1970, forKey: "lastLogTime_\(trackerId)")

        return .result()
    }
}

// MARK: - Timeline

struct TaliEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct TaliProvider: TimelineProvider {
    func placeholder(in context: Context) -> TaliEntry {
        TaliEntry(date: .now, snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (TaliEntry) -> Void) {
        completion(TaliEntry(date: .now, snapshot: loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TaliEntry>) -> Void) {
        let entry = TaliEntry(date: .now, snapshot: loadSnapshot())
        // Refresh every 30 minutes to keep "time ago" labels fresh
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Widget Views

struct TrackerButtonView: View {
    let tracker: TrackerInfo
    let todayCount: Int
    let lastLogTime: String?

    var body: some View {
        Button(intent: QuickLogIntent(trackerId: tracker.id, trackerName: tracker.name)) {
            VStack(spacing: 4) {
                Text(tracker.icon)
                    .font(.title2)
                Text(tracker.name)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                if todayCount > 0 {
                    Text("\(todayCount)x today")
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.plain)
    }
}

struct TaliWidgetSmallView: View {
    let entry: TaliEntry

    var body: some View {
        if let snapshot = entry.snapshot, !snapshot.trackers.isEmpty {
            let tracker = snapshot.trackers[0]
            let count = snapshot.todayLogs.filter { $0.trackerId == tracker.id }.count
            VStack(spacing: 8) {
                Text(tracker.icon)
                    .font(.largeTitle)
                Text(tracker.name)
                    .font(.headline)
                if count > 0 {
                    Text("\(count)x today")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Button(intent: QuickLogIntent(trackerId: tracker.id, trackerName: tracker.name)) {
                    Text("Log")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 6)
                        .background(Color.purple)
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            VStack(spacing: 8) {
                Text("📋")
                    .font(.largeTitle)
                Text("Open Tali")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("to set up")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

struct TaliWidgetMediumView: View {
    let entry: TaliEntry

    var body: some View {
        if let snapshot = entry.snapshot, !snapshot.trackers.isEmpty {
            let displayTrackers = Array(snapshot.trackers.prefix(4))
            HStack(spacing: 8) {
                ForEach(displayTrackers) { tracker in
                    let count = snapshot.todayLogs.filter { $0.trackerId == tracker.id }.count
                    TrackerButtonView(
                        tracker: tracker,
                        todayCount: count,
                        lastLogTime: snapshot.todayLogs.first(where: { $0.trackerId == tracker.id })?.loggedAt
                    )
                }
            }
            .padding(.horizontal, 4)
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            VStack(spacing: 8) {
                Text("📋")
                    .font(.largeTitle)
                Text("Open Tali to set up trackers")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

// MARK: - Widget Entry Point

@main
struct TaliWidget: Widget {
    let kind = "TaliWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TaliProvider()) { entry in
            if #available(iOSApplicationExtension 17.0, *) {
                TaliWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Quick Log")
        .description("Tap to log entries without opening the app")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct TaliWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: TaliEntry

    var body: some View {
        switch family {
        case .systemSmall:
            TaliWidgetSmallView(entry: entry)
        case .systemMedium:
            TaliWidgetMediumView(entry: entry)
        default:
            TaliWidgetMediumView(entry: entry)
        }
    }
}
