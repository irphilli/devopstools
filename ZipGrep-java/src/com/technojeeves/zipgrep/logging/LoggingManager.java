package com.technojeeves.zipgrep.logging;

import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.Logger;


public class LoggingManager {
    private static final String FORMAT_PROP_KEY = "java.util.logging.SimpleFormatter.format";
    private static final String ONE_LINE_FORMAT = "%4$s: %5$s [%1$tc]%n";
    public LoggingManager() {}

    /**
     * Dynamically alter the logging level if user wants to
     */
    public void init(Logger log) {
        // Make sure we don't have a nasty n>1-line log message
	//TODO
	// We need to find out how to get the whole stack trace AND allow normal debug messages to just be restricted to one line
        //System.setProperty(FORMAT_PROP_KEY, ONE_LINE_FORMAT);

        Handler[] handlers = log.getHandlers();

        for (Handler h : handlers) {
            h.setLevel(Level.FINE);
        }

        log.setLevel(Level.FINE);
    }
}
