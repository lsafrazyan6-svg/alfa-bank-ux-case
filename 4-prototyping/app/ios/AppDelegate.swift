import UIKit
import WebKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = PrototypeController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class PrototypeController: UIViewController, WKNavigationDelegate {
    private let web = WKWebView(frame: .zero)
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        web.translatesAutoresizingMaskIntoConstraints = false
        web.navigationDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.isInspectable = true
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        let refresh = UIRefreshControl()
        refresh.addTarget(self, action: #selector(reloadPreview), for: .valueChanged)
        web.scrollView.refreshControl = refresh
        web.load(URLRequest(url: URL(string: "http://127.0.0.1:4173/")!))
    }
    @objc private func reloadPreview() { web.reload(); web.scrollView.refreshControl?.endRefreshing() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        // This offline demo never opens a bank endpoint.
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        let local = url.isFileURL || (["127.0.0.1", "localhost"].contains(url.host ?? "") && url.port == 4173)
        decisionHandler(local ? .allow : .cancel)
    }
}
