import XCTest

final class MobileSmoke: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.staticTexts["Synthetic iOS smoke"].waitForExistence(timeout: 20))
    }

    override func record(_ issue: XCTIssue) {
        if let app = app {
            print("Synthetic accessibility hierarchy at failure:\n\(app.debugDescription)")
            let hierarchy = XCTAttachment(string: app.debugDescription)
            hierarchy.name = "Accessibility hierarchy at failure - \(name)"
            hierarchy.lifetime = .keepAlways
            add(hierarchy)
            let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            screenshot.name = "Screen at failure - \(name)"
            screenshot.lifetime = .keepAlways
            add(screenshot)
        }
        super.record(issue)
    }

    override func tearDownWithError() throws {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
        app.terminate()
    }

    func open(_ scenario: String) {
        app.links["Fixture \(scenario)"].tap()
    }

    func field(_ placeholder: String, type: XCUIElement.ElementType = .textView) -> XCUIElement {
        let element = app.descendants(matching: type).matching(NSPredicate(format: "placeholderValue == %@", placeholder)).firstMatch
        // WKWebView may omit controls outside its nested scrolling surface
        // from the accessibility tree. First wait for the question UI, then
        // discover the field with real scrolling before requiring a match.
        XCTAssertTrue(app.buttons["Submit answer"].waitForExistence(timeout: 20))
        for _ in 0..<10 {
            if element.waitForExistence(timeout: 0.5) && element.isHittable {
                return element
            }
            app.swipeUp()
        }
        XCTAssertTrue(element.exists, "Missing accessible text entry after scrolling: \(placeholder)")
        XCTAssertTrue(element.isHittable, "Text entry must be reachable after scrolling: \(placeholder)")
        return element
    }

    func reveal(_ element: XCUIElement) {
        for _ in 0..<8 {
            if element.isHittable { return }
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable, "Action must remain reachable")
    }

    func testCustomAskWithNativeKeyboard() {
        submitCustomAnswer("ask")
    }

    func testCustomSingleAskWithNativeKeyboard() {
        submitCustomAnswer("ask-single")
    }

    func submitCustomAnswer(_ scenario: String) {
        open(scenario)
        // A switch/radio ancestor must not swallow this editable AX control.
        let answer = field("Type your own answer…", type: .textField)
        reveal(answer)
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5), "Real simulator software keyboard must open")
        answer.typeText("Synthetic custom iOS answer")
        let submit = app.buttons["Submit answer"]
        reveal(submit)
        submit.tap()
        XCTAssertTrue(app.staticTexts["Synthetic assistant continuation received your answer."].waitForExistence(timeout: 20))
        XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 5), "Submitting dismisses software keyboard")
    }

    func testFreeRecallWithNativeKeyboard() {
        open("text")
        let answer = field("Type your answer…")
        reveal(answer)
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        answer.typeText("Synthetic recall iOS answer")
        let submit = app.buttons["Submit answer"]
        reveal(submit)
        submit.tap()
        XCTAssertTrue(app.staticTexts["Synthetic assistant continuation received your answer."].waitForExistence(timeout: 20))
    }

    func testNewSessionWithNativeKeyboard() {
        open("new")
        let answer = app.textViews.firstMatch
        XCTAssertTrue(answer.waitForExistence(timeout: 20))
        answer.tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 5))
        answer.typeText("Synthetic new iOS session")
        let send = app.buttons["Send"]
        reveal(send)
        send.tap()
        XCTAssertTrue(app.staticTexts["Synthetic session created"].waitForExistence(timeout: 20))
    }
}
