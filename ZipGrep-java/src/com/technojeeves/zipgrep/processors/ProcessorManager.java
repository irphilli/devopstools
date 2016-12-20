package com.technojeeves.zipgrep.processors;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Properties;
import java.util.Scanner;
import java.util.Set;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;

/**
 * This class manages how zip entries that are
 * files are handled - for grepping purposes
 * Also it handles which file extensions indicate
 * that they are files that are zip archives
 */
import com.technojeeves.zipgrep.logging.LoggingManager;

public class ProcessorManager {
    private final static String VALID_ARCHIVE_EXTENSIONS_LIST = "/resources/valid.archive.extensions.txt";

    // Off user.home
    private final static String USER_VALID_ARCHIVE_EXTENSIONS_LIST = ".zipgrep/valid.archive.extensions.txt";
    private final static String PROCESSING_CLASSES_FILE = "/resources/entry.processors.properties";

    // Off user.home
    private final static String USER_PROCESSING_CLASSES_FILE = ".zipgrep/entry.processors.properties";

    // Use the root logger
    private Logger log = Logger.getLogger("");

    // Centralising logging initialization
    private LoggingManager loggingManager;
    private boolean doDebug;
    private Set<String> validArchiveExtensions;
    private Map<String, IProcessor> processorsMap;
    private PrintWriter writer;

    public ProcessorManager() {}

    /**
     * Method description
     *
     */
    public void init() {
        validArchiveExtensions = new HashSet<>();
        loggingManager = new LoggingManager();
        loggingManager.init(log);
        loadValidArchiveExtensions();
        processorsMap = new HashMap<>();
        loadEntryProcessors();
    }

    /**
     * Method description
     *
     */
    protected void loadEntryProcessors() {

        // Load valid extensions list
        if (doDebug) {
            log.fine(String.format("Loading valid processors from %s", PROCESSING_CLASSES_FILE));
        }

        Properties processorsProps = new Properties();

        try (InputStream in = getClass().getResourceAsStream(PROCESSING_CLASSES_FILE)) {
            processorsProps.load(in);

            // Show what processors are mapped if debug on
            for (Map.Entry e : processorsProps.entrySet()) {
                String extension = e.getKey().toString();
                String className = e.getValue().toString();
                IProcessor processor = processorsMap.get(extension);

                if (processor == null) {
                    processorsMap.put(extension, (IProcessor) Class.forName(className).newInstance());
                }

                if (doDebug) {
                    log.fine(String.format("%s processor is %s", extension, className));
                }
            }

            // TODO load user mappings
        } catch (Exception e) {
            log.log(Level.SEVERE, e.getMessage(), e);
        }
    }

    /**
     * Method description
     *
     */
    protected void loadValidArchiveExtensions() {

        // Load valid extensions list
        if (doDebug) {
            log.fine(String.format("Loading valid extensions list from %s", VALID_ARCHIVE_EXTENSIONS_LIST));
        }

        try (Scanner s = new Scanner(getClass().getResourceAsStream(VALID_ARCHIVE_EXTENSIONS_LIST))) {
            while (s.hasNextLine()) {
                validArchiveExtensions.add(s.nextLine().toLowerCase());
            }
        }
    }

    /**
     * Process an entry. This consists of finding out whether there's a Processor registered for a particular
     * entry extension and then loading that class by reflection
     *
     * @param in
     * @param archiveFile
     * @param pathPrefix
     * @param entryName
     * @param searchPattern
     */
    public void processEntry(InputStream in, File archiveFile, String pathPrefix, String entryName,
                             Pattern searchPattern) {
        if (doDebug) {
            log.fine("ProcessorManager processing entry " + entryName);
        }

        String extension = ProcessorManager.getExtension(entryName);
        IProcessor processor = processorsMap.get(extension);

        if (processor != null) {
            processor.setWriter(this.writer);
            processor.processContent(in, archiveFile, pathPrefix, entryName, searchPattern);
        }
    }

    /**
     * Method description
     *
     *
     * @param value
     */
    public void setDoDebug(boolean value) {
        this.doDebug = value;
    }

    /**
     * Use to show what constitute valid extensions for archives
     *
     * @return
     */
    protected String getEntryProcessors() {
        StringWriter sw = new StringWriter();
        PrintWriter out = new PrintWriter(sw);

        for (Map.Entry<String, IProcessor> e : processorsMap.entrySet()) {
            out.printf("%s=%s%n", e.getKey(), e.getValue().getClass().getName());
        }

        return sw.toString();
    }

    /**
     * Method description
     *
     *
     * @param path
     *
     * @return
     */
    public static String getExtension(String path) {
        return path.replaceAll(".*(\\..*)$", "$1");
    }

    /**
     * Method description
     *
     *
     * @param archivePath
     *
     * @return
     */
    public boolean isValidArchiveExtension(String archivePath) {
        boolean result = false;
        String extension = ProcessorManager.getExtension(archivePath);

        result = validArchiveExtensions.contains(extension.toLowerCase());

        if (doDebug) {
            log.fine(String.format("ProcessorManager looked up if extension %s is valid for an archive - result was %b",
                                   extension,
                                   result));
        }

        return result;
    }

    /**
     * Use to show what constitute valid extensions for archives
     *
     * @return
     */
    protected String getValidArchiveExtensions() {
        StringWriter sw = new StringWriter();
        PrintWriter out = new PrintWriter(sw);

        for (String ext : validArchiveExtensions) {
            out.println(ext);
        }

        return sw.toString();
    }

    /**
     * We need to be able to decide where output is going to be printed
     * This needs to be propagated to other classes that need to produce output
     * @param writer The Writer to which to send output
     */
    public void setWriter(PrintWriter writer) {
        this.writer = writer;
    }
}


//~ Formatted by Jindent --- http://www.jindent.com
