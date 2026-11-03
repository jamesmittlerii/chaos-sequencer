cmake_minimum_required(VERSION 3.22)

set(LORENZ_VERSION "1.0.0" CACHE STRING "Version stamped into the bundles and installers")
project(LorenzMIDI VERSION ${LORENZ_VERSION} LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(JUCE_BUILD_EXTRAS OFF CACHE BOOL "" FORCE)
set(JUCE_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 9.0.5
    GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(JUCE)

juce_add_plugin(LorenzMIDI
    COMPANY_NAME "Lorenz"
    BUNDLE_ID com.lorenz.midi
    IS_SYNTH FALSE
    IS_MIDI_EFFECT TRUE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT TRUE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD FALSE
    PLUGIN_MANUFACTURER_CODE LnFr
    PLUGIN_CODE LzSq
    FORMATS AU VST3 Standalone
    PRODUCT_NAME "Lorenz"
    VST3_CATEGORIES Fx Midi
    NEEDS_WEBVIEW2 TRUE)

target_sources(LorenzMIDI PRIVATE
    Source/Engine/ChaosEngine.cpp
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp)

target_compile_definitions(LorenzMIDI PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_USE_WIN_WEBVIEW2_WITH_STATIC_LINKING=1
    JUCE_DISPLAY_SPLASH_SCREEN=0
    LORENZ_WEB_ROOT="${CMAKE_SOURCE_DIR}/.."
    LORENZ_JUCE_TAG="9.0.5")

target_link_libraries(LorenzMIDI
    PRIVATE
        juce::juce_audio_utils
        juce::juce_gui_extra
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)

set(LORENZ_REPO "${CMAKE_SOURCE_DIR}/..")

foreach(fmt AU VST3 Standalone)
    if(TARGET LorenzMIDI_${fmt})
        add_custom_command(TARGET LorenzMIDI_${fmt} POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E make_directory "$<TARGET_FILE_DIR:LorenzMIDI_${fmt}>/../Resources/web"
            COMMAND ${CMAKE_COMMAND} -E copy_if_different "${LORENZ_REPO}/index.html" "$<TARGET_FILE_DIR:LorenzMIDI_${fmt}>/../Resources/web/index.html"
            COMMAND ${CMAKE_COMMAND} -E copy_directory "${LORENZ_REPO}/css" "$<TARGET_FILE_DIR:LorenzMIDI_${fmt}>/../Resources/web/css"
            COMMAND ${CMAKE_COMMAND} -E copy_directory "${LORENZ_REPO}/js" "$<TARGET_FILE_DIR:LorenzMIDI_${fmt}>/../Resources/web/js"
            COMMAND ${CMAKE_COMMAND} -E copy_directory "${LORENZ_REPO}/presets" "$<TARGET_FILE_DIR:LorenzMIDI_${fmt}>/../Resources/web/presets"
            VERBATIM)
    endif()
endforeach()

add_executable(lorenz_engine_test
    tests/engine_test.cpp
    Source/Engine/ChaosEngine.cpp)
target_include_directories(lorenz_engine_test PRIVATE Source)
target_compile_definitions(lorenz_engine_test PRIVATE LORENZ_FIXTURE="${CMAKE_SOURCE_DIR}/tests/lorenz-fixture.csv")

juce_add_console_app(lorenz_host_test)
target_sources(lorenz_host_test PRIVATE
    tests/host_test.cpp
    Source/Engine/ChaosEngine.cpp
    Source/PluginProcessor.cpp
    Source/PluginEditor.cpp)
target_include_directories(lorenz_host_test PRIVATE Source)
target_compile_definitions(lorenz_host_test PRIVATE
    JUCE_WEB_BROWSER=1
    JUCE_USE_CURL=0
    JUCE_MODAL_LOOPS_PERMITTED=1
    LORENZ_WEB_ROOT="${CMAKE_SOURCE_DIR}/.."
    LORENZ_FIXTURE="${CMAKE_SOURCE_DIR}/tests/lorenz-fixture.csv"
    LORENZ_PRESETS="${CMAKE_SOURCE_DIR}/../presets")
target_link_libraries(lorenz_host_test PRIVATE
    juce::juce_audio_utils
    juce::juce_gui_extra
    juce::juce_recommended_config_flags
    juce::juce_recommended_warning_flags)
