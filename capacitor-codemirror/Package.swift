// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorCodemirror",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorCodemirror",
            targets: ["CodemirrorPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "CodemirrorPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/CodemirrorPlugin"),
        .testTarget(
            name: "CodemirrorPluginTests",
            dependencies: ["CodemirrorPlugin"],
            path: "ios/Tests/CodemirrorPluginTests")
    ]
)