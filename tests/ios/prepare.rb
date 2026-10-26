# Disposable generated Capacitor project only. Run after `cap sync ios`.
require 'xcodeproj'
require 'fileutils'
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)
app = project.targets.find { |target| target.name == 'App' } or abort 'Missing App target'
abort 'Smoke target already exists; regenerate the disposable project' if project.targets.any? { |target| target.name == 'MobileSmoke' }
test = project.new_target(:ui_test_bundle, 'MobileSmoke', :ios, '15.0')
test.add_dependency(app)
FileUtils.mkdir_p('ios/App/MobileSmoke')
FileUtils.cp('tests/ios/MobileSmoke.swift', 'ios/App/MobileSmoke/MobileSmoke.swift')
group = project.main_group.new_group('MobileSmoke', 'MobileSmoke')
test.add_file_references([group.new_file('MobileSmoke.swift')])
test.build_configurations.each do |config|
  config.build_settings.merge!({
    'TEST_TARGET_NAME' => 'App',
    'PRODUCT_BUNDLE_IDENTIFIER' => 'com.paperfront.learnharness.smoke.uitests',
    'GENERATE_INFOPLIST_FILE' => 'YES',
    'SWIFT_VERSION' => '5.0',
    'TARGETED_DEVICE_FAMILY' => '1,2',
    'CODE_SIGNING_ALLOWED' => 'NO'
  })
end
project.save
scheme = Xcodeproj::XCScheme.new
scheme.configure_with_targets(app, test, :launch_target => app)
scheme.save_as(project_path, 'MobileSmoke', true)
