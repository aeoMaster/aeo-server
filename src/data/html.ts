export const htmlToAnalyze = `<!doctype html>
<html lang="en"><!-- html_lang will now be "en" -->
<head>
  <title>Schema AEO Demo – full-metric test</title>
  <meta name="description" content="Demo page with FAQPage, HowTo, Speakable, freshness meta, E-E-A-T, entity links, canonical and hreflang tags.">
  <meta name="author" content="Jane Doe">
  <meta property="article:published_time" content="2025-05-30T09:00:00Z">
  <meta property="article:modified_time"  content="2025-06-01T12:00:00Z">

  <!-- canonical -->
  <link rel="canonical" href="https://example.com/en/aeo-demo.html">

  <!-- hreflang alternates -->
  <link rel="alternate" hreflang="en-gb" href="https://example.com/en/aeo-demo.html">
  <link rel="alternate" hreflang="fr-fr" href="https://example.com/fr/aeo-demo.html">

  <!-- FAQPage -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"FAQPage",
    "mainEntity":[
      { "@type":"Question",
        "name":"What is AEO?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Answer-Engine Optimisation helps AI answer engines surface your content."}},
      { "@type":"Question",
        "name":"Does JSON-LD help AEO?",
        "acceptedAnswer":{
          "@type":"Answer",
          "text":"Yes, JSON-LD is the clearest way to describe your content."}}
    ]}
  </script>

  <!-- HowTo -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"HowTo",
    "name":"How to change a flat tyre",
    "step":[
      { "@type":"HowToStep","url":"#step1","name":"Loosen the lug nuts"},
      { "@type":"HowToStep","url":"#step2","name":"Jack up the car"},
      { "@type":"HowToStep","url":"#step3","name":"Remove the flat tyre"}]}
  </script>

  <!-- Stand-alone Speakable -->
  <script type="application/ld+json">
  { "@context":"https://schema.org",
    "@type":"SpeakableSpecification",
    "xpath":["/html/body/article/p[1]"]}
  </script>
</head>

<body>
  <header>
    <h1>Schema.org Demo</h1>
    <p class="byline">By <span class="author">Jane Doe</span> • Updated 1 June 2025</p>
  </header>

  <p id="intro">
    <a href="https://en.wikipedia.org/wiki/Answer_engine_optimization">Answer-Engine optimisation</a>
    improves visibility in modern search; read the
    <a href="https://www.nytimes.com/2024/11/01/technology/seo-versus-aeo.html">NY Times overview</a>
    or this <a href="https://www.bbc.com/future/article/20250318-will-ai-change-how-we-search">BBC analysis</a>.
    <!-- Wiki links for testing -->
    <a href="https://en.wikipedia.org/wiki/Artificial_intelligence">Wikipedia AI</a>
    <a href="https://www.wikidata.org/wiki/Q42">Wikidata Q42</a>
    <a href="https://dbpedia.org/page/Artificial_intelligence">DBpedia AI</a>
  </p>

  <!-- Test images for alt extraction -->
  <img src="good.jpg" alt="A detailed description of the image for accessibility and SEO." />
  <img src="bad.jpg" alt="logo" />
  <img src="noalt.jpg" />

  <!-- Test videos for caption extraction -->
  <video src="with-captions.mp4" controls>
    <track kind="captions" src="captions_en.vtt" srclang="en" label="English" />
  </video>
  <video src="no-captions.mp4" controls></video>

  <article>
    <p id="step1"><strong>Step 1.</strong> Loosen each lug nut
       (<a href="https://www.who.int/roadsafety/publications/manuals/tyre-safety">WHO tyre-safety guide</a>)
       and see the <a href="https://openai.com/index/research-best-practices">OpenAI safety note</a>.
    </p>
    <p id="step2"><strong>Step 2.</strong> Jack up the car.</p>
    <p id="step3"><strong>Step 3.</strong> Remove the nuts and lift the tyre off.</p>
  </article>
</body>
</html>`;
