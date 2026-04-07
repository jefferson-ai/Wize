import SwiftUI

public struct GlassyNavigationTitle: View {
    public var icon: String?
    public var title: String
    public var tint: Color?
    public var interactive: Bool

    public init(icon: String? = "sparkles", title: String, tint: Color? = nil, interactive: Bool = true) {
        self.icon = icon
        self.title = title
        self.tint = tint
        self.interactive = interactive
    }

    public var body: some View {
        HStack(spacing: 8) {
            if let icon {
                Image(systemName: icon)
                    .font(.subheadline.weight(.semibold))
            }
            Text(title)
                .font(.headline)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .modifier(GlassEffectModifier(tint: tint, interactive: interactive))
    }
}

private struct GlassEffectModifier: ViewModifier {
    var tint: Color?
    var interactive: Bool

    func body(content: Content) -> some View {
        if let tint {
            content.glassEffect((interactive ? Glass.regular.tint(tint).interactive() : Glass.regular.tint(tint)), in: .capsule)
        } else {
            content.glassEffect((interactive ? Glass.regular.interactive() : Glass.regular), in: .capsule)
        }
    }
}

#Preview("Glassy Navigation Title Demo") {
    ZStack {
        LinearGradient(colors: [.indigo, .cyan], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()

        NavigationStack {
            List {
                Text("Item 1")
                Text("Item 2")
            }
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    GlassyNavigationTitle(title: "Dashboard", tint: .orange)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(.glass)
                }
            }
        }
    }
}
